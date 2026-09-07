import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function createPngBuffer(width, height, drawPixelFn) {
  // RGBA raw scanlines: each row is 1 filter byte (0) + width * 4 bytes
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixelFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf, start, length) {
    let c = 0xffffffff;
    for (let i = start; i < start + length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function createChunk(type, data) {
    const len = data.length;
    const chunk = Buffer.alloc(12 + len);
    chunk.writeUInt32BE(len, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    const crc = crc32(chunk, 4, 4 + len);
    chunk.writeUInt32BE(crc, 8 + len);
    return chunk;
  }

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // deflate
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // no interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw the AuthForge Icon: Deep dark blue rounded background, Indigo shield, Golden Key
function drawAuthForgeIcon(x, y, width, height, maskable = false) {
  const nx = x / width;
  const ny = y / height;
  const cx = 0.5;
  const cy = 0.5;

  // Background
  let bgR = Math.round(15 + nx * 10);
  let bgG = Math.round(23 + ny * 15);
  let bgB = Math.round(42 + (nx + ny) * 35);
  let bgA = 255;

  if (!maskable) {
    // Rounded squircle
    const rx = Math.abs(nx - 0.5) * 2;
    const ry = Math.abs(ny - 0.5) * 2;
    const cornerDist = Math.pow(rx, 4) + Math.pow(ry, 4);
    if (cornerDist > 1.05) {
      return [0, 0, 0, 0]; // Transparent outside squircle
    }
  }

  // Shield Geometry (centered around cx=0.5, cy=0.48, width ~0.55, height ~0.65)
  const dx = Math.abs(nx - 0.5);
  const dy = ny - 0.22;

  let inShield = false;
  let inInnerShield = false;

  if (dy >= 0 && dy <= 0.6) {
    const shieldWidthAtY = dy < 0.25 
      ? 0.28 
      : 0.28 * Math.max(0, 1 - Math.pow((dy - 0.25) / 0.35, 1.6));
    if (dx <= shieldWidthAtY) {
      inShield = true;
    }
    const innerShieldWidthAtY = dy < 0.25 
      ? 0.23 
      : 0.23 * Math.max(0, 1 - Math.pow((dy - 0.25) / 0.35, 1.6));
    if (dy >= 0.05 && dy <= 0.54 && dx <= innerShieldWidthAtY) {
      inInnerShield = true;
    }
  }

  if (inShield) {
    if (!inInnerShield) {
      // Outer shield border: bright indigo/blue gradient
      const t = ny;
      return [
        Math.round(99 * (1 - t) + 59 * t),
        Math.round(102 * (1 - t) + 130 * t),
        Math.round(241 * (1 - t) + 246 * t),
        255
      ];
    } else {
      // Inner shield fill: deep violet
      bgR = 30;
      bgG = 27;
      bgB = 75;
    }
  }

  // Key Icon (around cx=0.46, cy=0.46)
  const kdx = nx - 0.45;
  const kdy = ny - 0.45;
  const keyDist = Math.sqrt(kdx * kdx + kdy * kdy);

  // Key Ring
  if (keyDist <= 0.09 && keyDist >= 0.045) {
    return [251, 191, 36, 255]; // Golden
  }

  // Key Stem & Teeth
  if (nx >= 0.50 && nx <= 0.65 && Math.abs(ny - 0.46) <= 0.02) {
    return [251, 191, 36, 255]; // Golden stem
  }
  // Teeth
  if (nx >= 0.58 && nx <= 0.61 && ny >= 0.46 && ny <= 0.52) {
    return [251, 191, 36, 255];
  }
  if (nx >= 0.63 && nx <= 0.65 && ny >= 0.46 && ny <= 0.51) {
    return [251, 191, 36, 255];
  }

  // Signal waves below key
  const sw_dy1 = ny - 0.64;
  const sw_dx1 = Math.abs(nx - 0.5);
  if (sw_dx1 <= 0.16 && Math.abs(sw_dy1 - sw_dx1 * sw_dx1 * 0.4) <= 0.012) {
    return [56, 189, 248, 220]; // Cyan wave
  }
  const sw_dy2 = ny - 0.69;
  if (sw_dx1 <= 0.21 && Math.abs(sw_dy2 - sw_dx1 * sw_dx1 * 0.4) <= 0.012) {
    return [56, 189, 248, 160]; // Secondary wave
  }

  return [bgR, bgG, bgB, bgA];
}

const publicDir = path.resolve('public');

// Generate 192x192
console.log('Generating 192x192 PNG...');
const png192 = createPngBuffer(192, 192, (x, y, w, h) => drawAuthForgeIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);

// Generate 512x512
console.log('Generating 512x512 PNG...');
const png512 = createPngBuffer(512, 512, (x, y, w, h) => drawAuthForgeIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);

// Generate maskable 512x512 (edge-to-edge for Android adaptive icons)
console.log('Generating 512x512 maskable PNG...');
const pngMaskable = createPngBuffer(512, 512, (x, y, w, h) => drawAuthForgeIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable);

console.log('Icons generated successfully in public/');
