import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function generatePng(size, isMaskable = false) {
  const width = size;
  const height = size;
  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 2; // RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk('IHDR', ihdrData);

  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(height * rowSize);

  const center = size / 2;
  const ticketW = size * (isMaskable ? 0.44 : 0.54);
  const ticketH = size * (isMaskable ? 0.32 : 0.38);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter: None
    
    // Background gradient calculation (dark navy to vibrant deep blue)
    const normY = y / height;
    const bgR = Math.round(15 + normY * 16); // 15 -> 31
    const bgG = Math.round(23 + normY * 40); // 23 -> 63
    const bgB = Math.round(42 + normY * 130); // 42 -> 172

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      
      const dx = Math.abs(x - center);
      const dy = Math.abs(y - center);

      // Check if inside ticket shape
      const inTicket = dx <= ticketW / 2 && dy <= ticketH / 2;
      // Ticket notches on left and right
      const notchRadius = size * 0.05;
      const onLeftNotch = Math.hypot(x - (center - ticketW / 2), y - center) < notchRadius;
      const onRightNotch = Math.hypot(x - (center + ticketW / 2), y - center) < notchRadius;

      // Inside ticket star / barcode details
      const isDashedLine = inTicket && Math.abs(x - (center + ticketW * 0.1)) < 2 && (Math.floor(y / 4) % 2 === 0);

      if (inTicket && !onLeftNotch && !onRightNotch) {
        if (isDashedLine) {
          // Dash separator
          raw[pxOffset] = 147;
          raw[pxOffset + 1] = 197;
          raw[pxOffset + 2] = 253;
        } else {
          // Electric gradient ticket body
          const tNorm = (x - (center - ticketW / 2)) / ticketW;
          raw[pxOffset] = Math.round(37 + tNorm * 50); // 37 -> 87
          raw[pxOffset + 1] = Math.round(99 + tNorm * 60); // 99 -> 159
          raw[pxOffset + 2] = 235; // 235
        }
      } else {
        // Background
        raw[pxOffset] = bgR;
        raw[pxOffset + 1] = bgG;
        raw[pxOffset + 2] = bgB;
      }
    }
  }

  const idat = chunk('IDAT', zlib.deflateSync(raw));
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([header, ihdr, idat, iend]);
}

const iconsDir = path.resolve('public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

// 1. Generate PNGs
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generatePng(192, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generatePng(512, false));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), generatePng(512, true));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), generatePng(180, false));

// 2. Generate crisp SVG Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0f1d"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
    <linearGradient id="ticketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="50%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="14" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  
  <!-- Outer Glow Glow Circle -->
  <circle cx="256" cy="256" r="160" fill="#2563eb" opacity="0.15" filter="url(#glow)"/>
  
  <!-- Ticket Body with Notches -->
  <g transform="rotate(-8 256 256)" filter="url(#glow)">
    <path d="M 120 180 
             A 20 20 0 0 1 140 160 
             L 372 160 
             A 20 20 0 0 1 392 180 
             L 392 232 
             A 24 24 0 0 0 392 280 
             L 392 332 
             A 20 20 0 0 1 372 352 
             L 140 352 
             A 20 20 0 0 1 120 332 
             L 120 280 
             A 24 24 0 0 0 120 232 
             Z" 
          fill="url(#ticketGrad)" stroke="#60a5fa" stroke-width="4"/>
    
    <!-- Dashed Tear Line -->
    <line x1="310" y1="166" x2="310" y2="346" stroke="#ffffff" stroke-width="3" stroke-dasharray="6,6" opacity="0.7"/>
    
    <!-- Star / Event Spark -->
    <path d="M 215 220 L 223 246 L 249 254 L 223 262 L 215 288 L 207 262 L 181 254 L 207 246 Z" fill="#ffffff"/>
    
    <!-- QR Stub Elements -->
    <rect x="330" y="210" width="36" height="36" rx="6" fill="#ffffff" opacity="0.9"/>
    <rect x="340" y="220" width="16" height="16" rx="2" fill="#1e1b4b"/>
    <rect x="334" y="266" width="28" height="8" rx="4" fill="#ffffff" opacity="0.7"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent);
fs.writeFileSync(path.resolve('public', 'favicon.svg'), svgContent);

console.log('All PWA icons successfully generated in public/icons/');
