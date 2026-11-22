import { describe, expect, it } from 'vitest';
import { libraryEmptyCase } from './libraryEmptyCase';

const reachable = [{ id: 'r1', path: '/media/films', reachable: true }];

describe('libraryEmptyCase', () => {
  it('blames the filters when there are some, whatever the library holds', () => {
    expect(libraryEmptyCase({ filtered: true, scanning: true, roots: [] })).toBe('noMatch');
  });

  it('tells a running scan before anything else', () => {
    expect(libraryEmptyCase({ scanning: true, roots: [{ id: 'r1', path: '/x', reachable: false }] })).toBe('scanning');
  });

  it('tells a library without folders', () => {
    expect(libraryEmptyCase({ scannedAt: '2026-01-01T00:00:00Z', roots: [] })).toBe('noFolder');
  });

  it('tells an unreachable folder apart from an empty one', () => {
    const roots = [...reachable, { id: 'r2', path: '/mnt/nas', reachable: false }];
    expect(libraryEmptyCase({ scannedAt: '2026-01-01T00:00:00Z', roots })).toBe('unreachable');
  });

  it('tells a library never scanned', () => {
    expect(libraryEmptyCase({ roots: reachable })).toBe('neverScanned');
  });

  it('says nothing was found once scanned over reachable folders', () => {
    expect(libraryEmptyCase({ scannedAt: '2026-01-01T00:00:00Z', roots: reachable })).toBe('nothingFound');
  });

  it('does not take an unknown reachability, or unknown roots, for an unreachable folder', () => {
    expect(libraryEmptyCase({ scannedAt: '2026-01-01T00:00:00Z', roots: [{ id: 'r1', path: '/x' }] })).toBe('nothingFound');
    expect(libraryEmptyCase({ scannedAt: '2026-01-01T00:00:00Z', roots: null })).toBe('nothingFound');
  });
});
