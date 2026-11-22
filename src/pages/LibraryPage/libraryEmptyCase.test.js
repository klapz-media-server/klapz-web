import { describe, expect, it } from 'vitest';
import { libraryEmptyCase } from './libraryEmptyCase';

const roots = [{ id: 'r1', path: '/media/films' }];

describe('libraryEmptyCase', () => {
  it('blames the filters when there are some, whatever the library holds', () => {
    expect(libraryEmptyCase({ filtered: true, scanning: true, roots: [] })).toBe('noMatch');
  });

  it('tells a running scan before anything else', () => {
    expect(libraryEmptyCase({ scanning: true, roots: [] })).toBe('scanning');
  });

  it('tells a library without folders', () => {
    expect(libraryEmptyCase({ scannedAt: '2026-01-01T00:00:00Z', roots: [] })).toBe('noFolder');
  });

  it('tells a library never scanned', () => {
    expect(libraryEmptyCase({ roots })).toBe('neverScanned');
  });

  it('says nothing was found once scanned', () => {
    expect(libraryEmptyCase({ scannedAt: '2026-01-01T00:00:00Z', roots })).toBe('nothingFound');
  });

  it('does not take unknown roots for a library without folders', () => {
    expect(libraryEmptyCase({ scannedAt: '2026-01-01T00:00:00Z', roots: null })).toBe('nothingFound');
  });
});
