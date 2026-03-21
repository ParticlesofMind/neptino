import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const iconsDir = join(distDir, 'icons');

// Ensure directories exist
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Minimal valid 1x1 blue PNG (base64 encoded)
// This is a real, valid PNG file that can be scaled
const minimalBluePNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// For larger sizes, we'll create a simple solid color PNG
// Using a known-good minimal PNG structure
function createSolidColorPNG(size, r = 59, g = 130, b = 246) {
  // This creates a minimal valid PNG with a solid color
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // Helper to create CRC32
  function crc32(data) {
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0; // Ensure unsigned
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
      crc = crc >>> 0; // Ensure unsigned
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  
  // Helper to create chunk
  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const dataBuf = Buffer.from(data);
    const combined = Buffer.concat([typeBuf, dataBuf]);
    const crc = crc32(combined);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(dataBuf.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([length, typeBuf, dataBuf, crcBuf]);
  }
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = chunk('IHDR', ihdrData);
  
  // Create image data (uncompressed for simplicity)
  // Each row: filter byte (0) + RGB data
  const rowSize = size * 3 + 1;
  const imageData = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowSize;
    imageData[rowStart] = 0; // No filter
    for (let x = 0; x < size; x++) {
      const offset = rowStart + 1 + x * 3;
      imageData[offset] = r;
      imageData[offset + 1] = g;
      imageData[offset + 2] = b;
    }
  }
  
  // Simple zlib compression (uncompressed block)
  function adler32(data) {
    let a = 1, b = 0;
    for (let i = 0; i < data.length; i++) {
      a = (a + data[i]) % 65521;
      b = (b + a) % 65521;
    }
    return (b << 16) | a;
  }
  
  const len = imageData.length;
  if (len > 65535) {
    throw new Error(`Image data too large for uncompressed block: ${len} bytes`);
  }
  const lenLE = Buffer.alloc(2);
  lenLE.writeUInt16LE(len, 0);
  const nlenLE = Buffer.alloc(2);
  nlenLE.writeUInt16LE((~len) & 0xFFFF, 0);
  const adler = adler32(imageData);
  const adlerBuf = Buffer.alloc(4);
  // Adler-32 is stored in little-endian format in zlib
  adlerBuf.writeUInt32LE(adler >>> 0, 0); // Ensure unsigned
  
  // Zlib: header + uncompressed block + data + checksum
  const zlibData = Buffer.concat([
    Buffer.from([0x78, 0x9C]), // zlib header
    Buffer.from([0x01]), // BFINAL=1, BTYPE=00 (no compression)
    lenLE, nlenLE, // length and ~length
    imageData, // actual data
    adlerBuf // adler32 checksum
  ]);
  
  const idat = chunk('IDAT', zlibData);
  const iend = chunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Generate icons
const sizes = [16, 48, 128];
const blueColor = [59, 130, 246]; // #3b82f6

console.log('Generating placeholder icons...\n');

sizes.forEach(size => {
  try {
    const pngData = createSolidColorPNG(size, ...blueColor);
    const iconPath = join(iconsDir, `icon${size}.png`);
    writeFileSync(iconPath, pngData);
    console.log(`✓ Created ${iconPath} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ Failed to create icon${size}.png:`, error.message);
  }
});

console.log('\n✓ Placeholder icons created!');
console.log('You can replace these with custom icons later.');
console.log('To generate better icons, open dist/generate-icons.html in your browser.');

