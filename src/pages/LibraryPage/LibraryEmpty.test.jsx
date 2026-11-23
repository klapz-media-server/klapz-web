import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MockedProvider } from '@apollo/client/testing/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { LIBRARY_SCAN_STATE } from '../../graphql/queries';
import LibraryEmpty from './LibraryEmpty';

const ID = 'TGlicmFyeToy';
const ROOT = { __typename: 'Root', id: 'Um9vdDox', path: '/media/films' };

beforeAll(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage('en');
});

let root;
let container;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function mocks({ scanning = false, scannedAt = null } = {}) {
  return [
    {
      request: { query: LIBRARY_SCAN_STATE, variables: { id: ID } },
      result: {
        data: {
          node: {
            __typename: 'Library',
            id: ID,
            scanning,
            scannedAt,
            scanFailure: null,
            analysis: {
              __typename: 'LibraryAnalysis',
              fileCount: 0,
              readFileCount: 0,
              completeFileCount: 0,
              reading: false,
              failure: null,
            },
          },
        },
      },
      maxUsageCount: Number.POSITIVE_INFINITY,
    },
  ];
}

async function render(props, state) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MockedProvider mocks={mocks(state)} mockLinkDefaultOptions={{ delay: 0 }}>
        <LibraryEmpty libraryId={ID} kind="MOVIE" roots={[ROOT]} filtered={false} canEdit={false} owner={false} {...props} />
      </MockedProvider>,
    );
  });
  // Lets the mocked queries answer.
  for (let i = 0; i < 3; i += 1) {
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  }
  return container;
}

const title = () => container.querySelector('h2')?.textContent;
const buttons = () => [...container.querySelectorAll('button')].map((b) => b.textContent);
const SCANNED = '2026-11-01T10:00:00Z';

describe('LibraryEmpty', () => {
  it('offers to clear filters that match nothing', async () => {
    const onClearFilters = vi.fn();
    await render({ filtered: true, onClearFilters });
    expect(title()).toBe('No items match these filters');
    const clear = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Clear filters');
    await act(async () => clear.click());
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it('says a scan is running, as a live status, without actions', async () => {
    await render({ canEdit: true, owner: true }, { scanning: true });
    expect(title()).toBe('Scanning your folders…');
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(buttons()).toEqual([]);
  });

  it('shows an owner the folders that hold nothing, the naming expected and the actions', async () => {
    await render({ canEdit: true, owner: true }, { scannedAt: SCANNED });
    expect(title()).toBe('No media found in these folders');
    expect(container.textContent).toContain('/media/films');
    expect(container.textContent).toContain('Inception (2010)');
    expect(buttons()).toEqual(['Edit folders', 'Scan again']);
  });

  it('lets a library admin scan, but leaves the folders to the owners', async () => {
    await render({ canEdit: true, owner: false }, { scannedAt: SCANNED });
    expect(buttons()).toEqual(['Scan again']);
  });

  it('tells a viewer the library is empty, without paths nor actions', async () => {
    await render({}, { scannedAt: SCANNED });
    expect(title()).toBe('This library is empty');
    expect(container.textContent).not.toContain('/media/films');
    expect(buttons()).toEqual([]);
  });

  it('offers to scan a library never scanned', async () => {
    await render({ canEdit: true, owner: true });
    expect(title()).toBe('This library has not been scanned yet');
    expect(buttons()).toEqual(['Scan now', 'Edit folders']);
  });

  it('offers an owner to add a folder to a library without any', async () => {
    await render({ canEdit: true, owner: true, roots: [] }, { scannedAt: SCANNED });
    expect(title()).toBe('This library has no folder');
    expect(buttons()).toEqual(['Add a folder']);
  });
});
