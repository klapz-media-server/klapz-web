import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import '../../i18n';
import { CREATE_LIBRARY } from '../../graphql/mutations';
import { LANGUAGES, SERVER_DIRECTORIES } from '../../graphql/queries';
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

/** The server's `Language` enum, cut to a few values. */
const languages = {
  request: { query: LANGUAGES },
  result: {
    data: {
      __type: {
        __typename: '__Type',
        enumValues: [
          ['DE', 'German'],
          ['EN', 'English'],
          ['FR', 'French'],
          ['UND', 'Undetermined'],
        ].map(([name, description]) => ({ __typename: '__EnumValue', name, description })),
      },
    },
  },
};

const ROOT = { __typename: 'LibraryRoot', id: 'root-1', path: '/media/films' };

function created(input, payload) {
  return {
    request: { query: CREATE_LIBRARY, variables: { input } },
    result: { data: { createLibrary: { __typename: 'CreateLibraryPayload', ...payload } } },
  };
}

function newLibrary(owner, mocks = []) {
  useViewer.mockReturnValue({ owner });
  const onClose = vi.fn();
  render(
    <MockedProvider mocks={[languages, ...mocks]}>
      <LibraryEditor open library={null} onClose={onClose} />
    </MockedProvider>,
  );
  return onClose;
}

function fill({ title, folder, region }) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: title } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Folder 1' }), { target: { value: folder } });
  if (region !== undefined) fireEvent.change(screen.getByRole('textbox', { name: 'Region' }), { target: { value: region } });
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

  it('offers the server languages, without those no metadata comes in', async () => {
    newLibrary(true);
    const picker = screen.getByRole('combobox', { name: 'Metadata language' });
    await screen.findByRole('option', { name: 'German' });
    expect([...picker.options].map((option) => option.textContent)).toEqual(['English', 'French', 'German']);
    expect(picker.value).toBe('EN');
    expect(screen.getByRole('textbox', { name: 'Region' }).value).toBe('US');
  });

  it('creates a library with the language and region chosen', async () => {
    const library = {
      __typename: 'Library',
      id: 'lib-1',
      title: 'Films',
      kind: 'MOVIE',
      language: { __typename: 'Locale', tag: 'fr-CA', language: 'FR', script: null, region: 'CA', name: 'French', nativeName: 'français' },
      hidden: false,
      scanning: true,
      roots: [ROOT],
    };
    const onClose = newLibrary(true, [
      created({ title: 'Films', kind: 'MOVIE', language: { language: 'FR', region: 'CA' }, roots: ['/media/films'] }, { library, userErrors: [] }),
    ]);
    await screen.findByRole('option', { name: 'French' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Metadata language' }), { target: { value: 'FR' } });
    fill({ title: 'Films', folder: '/media/films', region: 'ca' });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('sends no region when it is left empty', async () => {
    const onClose = newLibrary(true, [
      created({ title: 'Filme', kind: 'MOVIE', language: { language: 'DE' }, roots: ['/media/filme'] }, { library: null, userErrors: [] }),
    ]);
    await screen.findByRole('option', { name: 'German' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Metadata language' }), { target: { value: 'DE' } });
    fill({ title: 'Filme', folder: '/media/filme', region: '' });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('refuses a region that is not one before asking the server', async () => {
    const onClose = newLibrary(true);
    fill({ title: 'Films', folder: '/media/films', region: 'Can' });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('A region of two letters, such as CA, or three digits, such as 419.')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Metadata language' }).getAttribute('aria-invalid')).toBe('true');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the server refusing the language beside it', async () => {
    const onClose = newLibrary(true, [
      created(
        { title: 'Films', kind: 'MOVIE', language: { language: 'EN', region: 'ZZ' }, roots: ['/media/films'] },
        { library: null, userErrors: [{ __typename: 'LibraryUserError', field: ['input', 'language'], code: 'INVALID_LANGUAGE' }] },
      ),
    ]);
    fill({ title: 'Films', folder: '/media/films', region: 'ZZ' });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('A region of two letters, such as CA, or three digits, such as 419.')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('offers no browsing to who is not an owner', () => {
    newLibrary(false);
    expect(screen.queryByRole('button', { name: 'Browse the folders of the server' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Folder 1' })).toBeTruthy();
  });
});
