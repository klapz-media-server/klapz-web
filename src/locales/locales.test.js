import { describe, expect, it } from 'vitest';
import en from './en/translation.json';
import fr from './fr/translation.json';

// French may leave out optional plural forms (`_many`); every other key must be translated.
describe('locales', () => {
  it('translates every English key into French', () => {
    const missing = Object.keys(en).filter((key) => !key.endsWith('_many') && !(key in fr));
    expect(missing).toEqual([]);
  });

  it('has no French key the code no longer uses', () => {
    expect(Object.keys(fr).filter((key) => !(key in en))).toEqual([]);
  });
});
