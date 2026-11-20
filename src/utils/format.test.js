import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { channelsLabel, episodeCode, formatBitrate, formatClock, formatDuration, progressRatio, resolutionLabel } from './format';

beforeAll(() => i18n.changeLanguage('en'));

describe('format', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBeNull();
    expect(formatDuration(42 * 60000)).toBe('42 min');
    expect(formatDuration(120 * 60000)).toBe('2 h');
    expect(formatDuration(99 * 60000)).toBe('1 h 39');
  });

  it('formats the player clock', () => {
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(3723)).toBe('1:02:03');
    expect(formatClock(-1)).toBe('0:00');
    expect(formatClock(Number.NaN)).toBe('0:00');
  });

  it('names resolutions and channel layouts', () => {
    expect(resolutionLabel(3840, 2160)).toBe('4K');
    expect(resolutionLabel(1920, 800)).toBe('1080p');
    expect(resolutionLabel(1280, 720)).toBe('720p');
    expect(resolutionLabel(720, 576)).toBe('576p');
    expect(resolutionLabel(640, 360)).toBe('SD');
    expect(resolutionLabel(null, 720)).toBeNull();
    expect(channelsLabel(2)).toBe('Stereo');
    expect(channelsLabel(6)).toBe('5.1');
    expect(channelsLabel(8)).toBe('7.1');
  });

  it('formats bitrates', () => {
    expect(formatBitrate(192)).toBe('192 kb/s');
    expect(formatBitrate(4000)).toBe('4 Mb/s');
    expect(formatBitrate(0)).toBeNull();
  });

  it('codes episodes and progress', () => {
    expect(episodeCode(1, 4)).toBe('S1 · E4');
    expect(episodeCode(null, 4)).toBe('E4');
    expect(progressRatio({ offsetMs: 30 }, 60)).toBe(0.5);
    expect(progressRatio({ offsetMs: 90 }, 60)).toBe(1);
    expect(progressRatio(null, 60)).toBe(0);
  });
});
