/**
 * BlurHash previews: the few colours a server worked out from an image, drawn as a tiny blurred
 * picture to show while the image itself loads. The server hashes posters on a 3×4 grid and
 * backdrops on a 4×3 one, as Plex does.
 */
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';

function decode83(text) {
  let value = 0;
  for (const digit of text) value = value * 83 + DIGITS.indexOf(digit);
  return value;
}

function srgbToLinear(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped <= 0.0031308
    ? Math.trunc(clamped * 12.92 * 255 + 0.5)
    : Math.trunc((1.055 * clamped ** (1 / 2.4) - 0.055) * 255 + 0.5);
}

const signedSquare = (value) => Math.sign(value) * value * value;

/**
 * The RGBA pixels of a `width` × `height` picture of `hash`, or null for something that is no
 * BlurHash.
 */
export function decodeBlurHash(hash, width, height) {
  if (typeof hash !== 'string' || hash.length < 6) return null;
  const size = decode83(hash[0]);
  const rows = Math.floor(size / 9) + 1;
  const columns = (size % 9) + 1;
  if (hash.length !== 4 + 2 * columns * rows) return null;
  const maximum = (decode83(hash[1]) + 1) / 166;

  const colors = [];
  for (let i = 0; i < columns * rows; i++) {
    if (i === 0) {
      const dc = decode83(hash.slice(2, 6));
      colors.push([srgbToLinear(dc >> 16), srgbToLinear((dc >> 8) & 255), srgbToLinear(dc & 255)]);
    } else {
      const ac = decode83(hash.slice(4 + i * 2, 6 + i * 2));
      const quantized = [Math.floor(ac / 361), Math.floor(ac / 19) % 19, ac % 19];
      colors.push(quantized.map((q) => signedSquare((q - 9) / 9) * maximum));
    }
  }

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < columns; i++) {
          const basis = Math.cos((Math.PI * x * i) / width) * Math.cos((Math.PI * y * j) / height);
          const [cr, cg, cb] = colors[i + j * columns];
          r += cr * basis;
          g += cg * basis;
          b += cb * basis;
        }
      }
      const at = 4 * (x + y * width);
      pixels[at] = linearToSrgb(r);
      pixels[at + 1] = linearToSrgb(g);
      pixels[at + 2] = linearToSrgb(b);
      pixels[at + 3] = 255;
    }
  }
  return pixels;
}

// A preview is the same for every card showing one image: drawn once.
const drawn = new Map();

/** A data URL of `hash`'s preview, to set as a CSS background; null when none can be drawn. */
export function blurHashDataUrl(hash) {
  if (!hash) return null;
  if (drawn.has(hash)) return drawn.get(hash);
  let url = null;
  try {
    const side = 32;
    const pixels = decodeBlurHash(hash, side, side);
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext('2d');
    if (pixels && context) {
      context.putImageData(new ImageData(pixels, side, side), 0, 0);
      url = canvas.toDataURL();
    }
  } catch {
    url = null;
  }
  drawn.set(hash, url);
  return url;
}
