import { describe, expect, it } from 'vitest';
import { defaultSubtitleId } from './useServerTrackOptions';

const locale = (tag) => ({ tag, language: tag.split('-')[0].toUpperCase() });

describe('defaultSubtitleId', () => {
  const streams = [
    { id: 'a-fr', kind: 'AUDIO', language: locale('fr-CA') },
    { id: 'a-en', kind: 'AUDIO', language: locale('en') },
    { id: 's-en', kind: 'SUBTITLE', isForced: true, language: locale('en') },
    { id: 's-fr', kind: 'SUBTITLE', isForced: true, language: locale('fr') },
  ];

  it('picks the forced subtitle in the language of the audio, whatever its region', () => {
    expect(defaultSubtitleId(streams, 'a-fr')).toBe('s-fr');
    expect(defaultSubtitleId(streams, 'a-en')).toBe('s-en');
  });

  it('takes any forced subtitle when the audio states no language', () => {
    const silent = [{ id: 'a', kind: 'AUDIO', language: null }, ...streams.slice(2)];
    expect(defaultSubtitleId(silent, 'a')).toBe('s-en');
  });
});
