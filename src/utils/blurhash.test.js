import { describe, expect, it } from 'vitest';
import { decodeBlurHash } from './blurhash';

describe('decodeBlurHash', () => {
  it('draws an opaque picture of the asked size', () => {
    // The example of the BlurHash reference implementation.
    const pixels = decodeBlurHash('LEHV6nWB2yk8pyo0adR*.7kCMdnj', 32, 32);
    expect(pixels).toHaveLength(32 * 32 * 4);
    expect(pixels[3]).toBe(255);
    expect(pixels[pixels.length - 1]).toBe(255);
  });

  it('draws the DC colour of a hash with no AC terms', () => {
    // One component (size 0), maximum 0, DC 0x808080.
    const flat = `00${'0'.repeat(0)}${encode83(0x808080, 4)}`;
    const pixels = decodeBlurHash(flat, 4, 4);
    expect(Array.from(pixels.slice(0, 3))).toEqual([128, 128, 128]);
  });

  it('refuses what is no BlurHash', () => {
    expect(decodeBlurHash('', 4, 4)).toBeNull();
    expect(decodeBlurHash('LEHV6nWB2yk8', 4, 4)).toBeNull();
    expect(decodeBlurHash(undefined, 4, 4)).toBeNull();
  });
});

function encode83(value, length) {
  const digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';
  let text = '';
  for (let place = length - 1; place >= 0; place--) text += digits[Math.floor(value / 83 ** place) % 83];
  return text;
}
