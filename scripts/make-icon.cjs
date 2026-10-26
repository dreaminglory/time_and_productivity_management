// Generates the app icon (256x256 PNG) used for the window, tray and installer.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const S = 256;
const SS = 4; // supersampling per axis for anti-aliasing

const BG = [27, 31, 42];
const RING = [91, 140, 255];
const ARC = [255, 184, 77];
const HAND = [236, 239, 245];

function insideRoundedRect(x, y, r) {
  const m = 8;
  const lo = m + r;
  const hi = S - m - r;
  const cx = Math.min(Math.max(x, lo), hi);
  const cy = Math.min(Math.max(y, lo), hi);
  return x >= m && x <= S - m && y >= m && y <= S - m && (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function sample(x, y) {
  if (!insideRoundedRect(x, y, 52)) return null;
  const c = S / 2;
  const d = Math.hypot(x - c, y - c);
  // Angle measured clockwise from 12 o'clock, in [0, 2π).
  const ang = (Math.atan2(x - c, -(y - c)) + 2 * Math.PI) % (2 * Math.PI);
  if (d >= 70 && d <= 88) return ang <= Math.PI * 1.35 ? ARC : RING;
  if (distToSegment(x, y, c, c, c, c - 50) <= 7) return HAND;
  if (distToSegment(x, y, c, c, c + 36, c + 14) <= 7) return HAND;
  if (d <= 10) return HAND;
  return BG;
}

const raw = Buffer.alloc(S * (S * 4 + 1));
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  for (let x = 0; x < S; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const col = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
        if (col) {
          r += col[0];
          g += col[1];
          b += col[2];
          a++;
        }
      }
    }
    const o = y * (S * 4 + 1) + 1 + x * 4;
    raw[o] = a ? r / a : 0;
    raw[o + 1] = a ? g / a : 0;
    raw[o + 2] = a ? b / a : 0;
    raw[o + 3] = Math.round((a / (SS * SS)) * 255);
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

const root = path.join(__dirname, '..');
for (const out of ['build/icon.png', 'electron/icon.png', 'public/icon.png']) {
  fs.mkdirSync(path.dirname(path.join(root, out)), { recursive: true });
  fs.writeFileSync(path.join(root, out), png);
}
console.log('icon written');
