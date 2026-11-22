import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import '../../i18n';
import { SERVER_DIRECTORIES } from '../../graphql/queries';
import FolderPicker from './FolderPicker';

beforeAll(() => {
  // jsdom has no modal dialogs.
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function close() {
    this.open = false;
  };
});

afterEach(cleanup);

/** The server's answer for `path`: its folders, named as a Windows server names them. */
function listed(path, parent, folders) {
  return {
    request: { query: SERVER_DIRECTORIES, variables: { path, first: 200 } },
    result: {
      data: {
        serverDirectories: {
          __typename: 'ServerDirectories',
          error: null,
          listing: {
            __typename: 'DirectoryListing',
            path,
            parent,
            truncated: false,
            directories: {
              __typename: 'DirectoryEntryConnection',
              nodes: folders.map((name) => ({
                __typename: 'DirectoryEntry',
                name,
                path: path ? `${path.replace(/\\$/, '')}\\${name}` : `${name}\\`,
              })),
              pageInfo: { __typename: 'PageInfo', hasNextPage: false, endCursor: null },
            },
          },
        },
      },
    },
  };
}

function refused(path, error) {
  return {
    request: { query: SERVER_DIRECTORIES, variables: { path, first: 200 } },
    result: { data: { serverDirectories: { __typename: 'ServerDirectories', error, listing: null } } },
  };
}

function open(mocks, start = '') {
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(
    <MockedProvider mocks={mocks}>
      <FolderPicker open start={start} onPick={onPick} onClose={onClose} />
    </MockedProvider>,
  );
  return { onPick, onClose };
}

const button = (name) => screen.getByRole('button', { name });
const select = () => button('Select this folder');

describe('FolderPicker', () => {
  it('reaches a folder from the drives by clicking only, and picks it', async () => {
    const { onPick, onClose } = open([
      listed(null, null, ['C:', 'D:']),
      listed('C:\\', null, ['Movies']),
      listed('C:\\Movies', 'C:\\', []),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'C:' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Movies' }));
    expect(await screen.findByText('No folder here.')).toBeTruthy();
    const crumbs = screen.getByRole('navigation', { name: 'Current folder' });
    expect([...crumbs.querySelectorAll('button')].map((crumb) => crumb.textContent)).toEqual(['Server', 'C:', 'Movies']);
    fireEvent.click(select());
    expect(onPick).toHaveBeenCalledWith('C:\\Movies');
    expect(onClose).toHaveBeenCalled();
  });

  it('cannot pick where browsing starts, only enter a drive', async () => {
    open([listed(null, null, ['C:'])]);
    await screen.findByRole('button', { name: 'C:' });
    expect(select().disabled).toBe(true);
    expect(button('Parent folder').disabled).toBe(true);
  });

  it('starts at the folder typed, and goes up to its parent', async () => {
    open([listed('C:\\Movies', 'C:\\', ['Pixar']), listed('C:\\', null, ['Movies'])], ' C:\\Movies ');
    await screen.findByRole('button', { name: 'Pixar' });
    fireEvent.click(button('Parent folder'));
    expect(await screen.findByRole('button', { name: 'Movies' })).toBeTruthy();
  });

  it('browses from the top when the path typed leads nowhere', async () => {
    open([refused('/nowhere', 'NOT_FOUND'), listed(null, null, ['/'])], '/nowhere');
    expect(await screen.findByText('The server finds no folder at the path typed: browse from the top.')).toBeTruthy();
    expect(await screen.findByRole('button', { name: '/' })).toBeTruthy();
  });

  it('says why a folder is not listed, and still lets one go up', async () => {
    open([listed(null, null, ['C:']), refused('C:\\', 'UNREADABLE'), listed(null, null, ['C:'])]);
    fireEvent.click(await screen.findByRole('button', { name: 'C:' }));
    expect((await screen.findByRole('alert')).textContent).toBe('The server is not allowed to read this folder.');
    expect(select().disabled).toBe(true);
    fireEvent.click(button('Parent folder'));
    expect(await screen.findByRole('button', { name: 'C:' })).toBeTruthy();
  });

  it('moves between folders with the arrow keys', async () => {
    open([listed(null, null, ['C:', 'D:'])]);
    const first = await screen.findByRole('button', { name: 'C:' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(button('D:'));
  });
});
