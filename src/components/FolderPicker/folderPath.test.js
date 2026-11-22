import { describe, expect, it } from 'vitest';
import { pathSegments } from './folderPath';

describe('pathSegments', () => {
  it('walks a Unix path down from /', () => {
    expect(pathSegments('/media/movies')).toEqual([
      { name: '/', path: '/' },
      { name: 'media', path: '/media' },
      { name: 'movies', path: '/media/movies' },
    ]);
    expect(pathSegments('/')).toEqual([{ name: '/', path: '/' }]);
  });

  it('starts a Windows path at its drive, whose own path ends with a backslash', () => {
    expect(pathSegments('D:\\Movies\\Pixar')).toEqual([
      { name: 'D:', path: 'D:\\' },
      { name: 'Movies', path: 'D:\\Movies' },
      { name: 'Pixar', path: 'D:\\Movies\\Pixar' },
    ]);
    expect(pathSegments('C:\\')).toEqual([{ name: 'C:', path: 'C:\\' }]);
  });

  it('starts a network path at its share', () => {
    expect(pathSegments('\\\\nas\\media\\Movies')).toEqual([
      { name: '\\\\nas\\media', path: '\\\\nas\\media' },
      { name: 'Movies', path: '\\\\nas\\media\\Movies' },
    ]);
  });

  it('has no step where browsing starts', () => {
    expect(pathSegments(null)).toEqual([]);
  });
});
