import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import '../../i18n';
import { SERVER_DIRECTORIES } from '../../graphql/queries';
import { useViewer } from '../../hooks/useViewer';
import LibraryEditor from './LibraryEditor';

vi.mock('../../hooks/useViewer', () => ({ useViewer: vi.fn() }));

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

/** The server's answer for `path`: `folders` as `[name, path]` pairs. */
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
              nodes: folders.map(([name, folder]) => ({ __typename: 'DirectoryEntry', name, path: folder })),
              pageInfo: { __typename: 'PageInfo', hasNextPage: false, endCursor: null },
            },
          },
        },
      },
    },
  };
}

function newLibrary(owner, mocks = []) {
  useViewer.mockReturnValue({ owner });
  render(
    <MockedProvider mocks={mocks}>
      <LibraryEditor open library={null} onClose={() => {}} />
    </MockedProvider>,
  );
}

describe('LibraryEditor', () => {
  it('lets an owner fill a folder by browsing the server', async () => {
    newLibrary(true, [listed(null, null, [['/', '/']]), listed('/', null, [['media', '/media']]), listed('/media', '/', [])]);
    fireEvent.click(screen.getByRole('button', { name: 'Browse the folders of the server' }));
    fireEvent.click(await screen.findByRole('button', { name: '/' }));
    fireEvent.click(await screen.findByRole('button', { name: 'media' }));
    await screen.findByText('No folder here.');
    fireEvent.click(screen.getByRole('button', { name: 'Select this folder' }));
    expect(screen.getByRole('textbox', { name: 'Folder 1' }).value).toBe('/media');
    expect(screen.queryByRole('button', { name: 'Select this folder' })).toBeNull();
  });

  it('offers no browsing to who is not an owner', () => {
    newLibrary(false);
    expect(screen.queryByRole('button', { name: 'Browse the folders of the server' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Folder 1' })).toBeTruthy();
  });
});
