import { describe, expect, it } from 'vitest';
import { itemPath, playPath, queryString, safeNext, segment, signInPath, tagPath } from './routes';

describe('segment', () => {
  it('keeps base64 ids readable and escapes what would break a path', () => {
    expect(segment('SXRlbTo1NzY5NDc=')).toBe('SXRlbTo1NzY5NDc=');
    expect(segment('a/b?c#d e')).toBe('a%2Fb%3Fc%23d%20e');
  });
});

describe('queryString', () => {
  it('drops empty values and keeps = inside values', () => {
    expect(queryString({ tag: 'VGFnOjk2MA==', kind: 'GENRE', empty: '', none: null })).toBe('?tag=VGFnOjk2MA==&kind=GENRE');
    expect(queryString({})).toBe('');
  });
});

describe('itemPath', () => {
  const show = { __typename: 'Show', id: 'U2hvdw==', slug: 'the-100' };
  const season = { __typename: 'Season', id: 'U2Vhc29u', slug: 'the-100-s01' };

  it('builds each kind of item', () => {
    expect(itemPath({ __typename: 'Movie', id: 'TW92aWU=', slug: 'les-croods' })).toBe('/movie/TW92aWU=/les-croods');
    expect(itemPath(show)).toBe('/show/U2hvdw==/the-100');
    expect(itemPath({ ...season, show })).toBe('/show/U2hvdw==/the-100/U2Vhc29u/the-100-s01');
    expect(itemPath({ __typename: 'Episode', id: 'RXA=', show, season })).toBe('/show/U2hvdw==/the-100/U2Vhc29u/the-100-s01#e-RXA=');
  });

  it('falls back when a slug or a parent is missing', () => {
    expect(itemPath({ __typename: 'Movie', id: 'TW92aWU=' })).toBe('/movie/TW92aWU=/-');
    expect(itemPath({ __typename: 'Episode', id: 'RXA=', show })).toBe('/show/U2hvdw==/the-100');
    expect(itemPath(null)).toBe('/');
  });
});

describe('playPath and tagPath', () => {
  it('resumes at a rounded position', () => {
    expect(playPath({ id: 'TW92aWU=', slug: 'x' }, 1234.6)).toBe('/play/TW92aWU=/x?t=1235');
    expect(playPath({ id: 'TW92aWU=', slug: 'x' }, 0)).toBe('/play/TW92aWU=/x');
  });

  it('filters a library by a tag', () => {
    expect(tagPath('TGli', { id: 'VGFn', kind: 'GENRE' })).toBe('/library/TGli?view=all&tag=VGFn&kind=GENRE');
    expect(tagPath(null, { id: 'VGFn' })).toBe('/');
  });
});

describe('safeNext', () => {
  it('keeps a path of the app', () => {
    expect(safeNext('/movie/abc?x=1#y')).toBe('/movie/abc?x=1#y');
  });

  it.each(['//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)', '/sign-in', '/sign-up/x', 42, undefined])(
    'refuses %s',
    (value) => {
      expect(safeNext(value)).toBe('/');
    },
  );

  it('leaves next out of the sign-in path when it is the home page', () => {
    expect(signInPath('/')).toBe('/sign-in');
    expect(signInPath('/admin')).toBe('/sign-in?next=%2Fadmin');
  });
});
