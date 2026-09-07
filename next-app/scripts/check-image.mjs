import fs from 'fs';
import zlib from 'zlib';

const buf = fs.readFileSync('C:\\Users\\Chaoscedd\\.gemini\\antigravity-ide\\brain\\0bea97b6-2a03-4e2a-846b-06263ff01cf2\\.user_uploaded\\media_1788635039084.png');
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
const colorType = buf.readUInt8(25);
console.log(`Image: ${width}x${height}, colorType: ${colorType}`);

let pos = 33;
const idatChunks = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  if (type === 'IDAT') {
    idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
  }
  pos += 12 + len;
}
const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 4;
const rowSize = 1 + width * bpp;

// Check rightmost 50 columns at different Y levels
for (let y = 100; y < height; y += 200) {
  const rowStart = y * rowSize + 1;
  const cols = [];
  for (let x = width - 25; x < width; x++) {
    const px = rowStart + x * bpp;
    cols.push(`[${decompressed[px]},${decompressed[px+1]},${decompressed[px+2]}]`);
  }
  console.log(`y=${y}: ${cols.slice(-10).join(' ')}`);
}

// Find the X coordinate where the color becomes white or light across all Y
for (let x = width - 1; x >= width - 50; x--) {
  let whiteCount = 0;
  for (let y = 100; y < height - 100; y += 10) {
    const px = y * rowSize + 1 + x * bpp;
    const r = decompressed[px], g = decompressed[px+1], b = decompressed[px+2];
    if (r > 200 && g > 200 && b > 200) whiteCount++;
  }
  console.log(`x=${x} (offset from right: ${width - 1 - x}): whiteCount=${whiteCount}`);
}
