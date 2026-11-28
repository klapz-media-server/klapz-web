import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_VOLUME,
  claimTheme,
  isThemeMusicEnabled,
  playTheme,
  releaseTheme,
  setThemeMusicEnabled,
  stopThemeMusic,
} from './themeMusic';

/** Every element the player made, with what was done to it. */
let made;

class FakeAudio {
  constructor() {
    this.volume = 1;
    this.paused = true;
    this.listeners = {};
    made.push(this);
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  load() {}
  removeAttribute(name) {
    if (name === 'src') this.src = '';
  }
  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }
}

beforeEach(() => {
  made = [];
  vi.useFakeTimers();
  vi.stubGlobal('Audio', FakeAudio);
  setThemeMusicEnabled(true);
});

afterEach(() => {
  stopThemeMusic();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('theme music', () => {
  it('fades a theme in to a moderate volume, once', async () => {
    claimTheme('show-1');
    playTheme('show-1', '/artwork/themes/a.mp3');
    await vi.advanceTimersByTimeAsync(3000);
    expect(made).toHaveLength(1);
    expect(made[0].volume).toBeCloseTo(THEME_VOLUME);
    playTheme('show-1', '/artwork/themes/a.mp3');
    expect(made).toHaveLength(1);
  });

  it('keeps playing between pages of the same series', async () => {
    claimTheme('show-1');
    playTheme('show-1', '/a.mp3');
    await vi.advanceTimersByTimeAsync(3000);
    releaseTheme('show-1');
    claimTheme('show-1');
    playTheme('show-1', '/a.mp3');
    await vi.advanceTimersByTimeAsync(3000);
    expect(made).toHaveLength(1);
    expect(made[0].paused).toBe(false);
  });

  it('fades out once the series is left', async () => {
    claimTheme('show-1');
    playTheme('show-1', '/a.mp3');
    await vi.advanceTimersByTimeAsync(3000);
    releaseTheme('show-1');
    await vi.advanceTimersByTimeAsync(3000);
    expect(made[0].paused).toBe(true);
  });

  it('switches to another series at once', async () => {
    claimTheme('show-1');
    playTheme('show-1', '/a.mp3');
    await vi.advanceTimersByTimeAsync(3000);
    releaseTheme('show-1');
    claimTheme('show-2');
    playTheme('show-1', '/a.mp3');
    playTheme('show-2', '/b.mp3');
    await vi.advanceTimersByTimeAsync(3000);
    expect(made).toHaveLength(2);
    expect(made[0].paused).toBe(true);
    expect(made[1].src).toBe('/b.mp3');
  });

  it('stops at once when turned off, and plays nothing while off', async () => {
    claimTheme('show-1');
    playTheme('show-1', '/a.mp3');
    await vi.advanceTimersByTimeAsync(3000);
    setThemeMusicEnabled(false);
    expect(isThemeMusicEnabled()).toBe(false);
    expect(made[0].paused).toBe(true);
    claimTheme('show-1');
    playTheme('show-1', '/a.mp3');
    expect(made).toHaveLength(1);
  });

  it('stays silent when the browser refuses to play', async () => {
    vi.spyOn(FakeAudio.prototype, 'play').mockRejectedValue(new Error('NotAllowedError'));
    claimTheme('show-1');
    playTheme('show-1', '/a.mp3');
    await vi.advanceTimersByTimeAsync(3000);
    expect(made[0].volume).toBe(0);
  });
});
