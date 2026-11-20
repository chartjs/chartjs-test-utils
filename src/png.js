/**
 * Lossless PNG recompression for the reference images written in update mode.
 *
 * Chromium's `canvas.toDataURL()` encodes with the fastest deflate setting, which
 * makes a PNG several times larger than its pixels need. Re-deflating the same
 * filtered scanlines at the best level changes no pixel.
 */

import {crc32, deflateSync, inflateSync} from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Re-deflates the pixel data of a PNG, leaving every other byte as it was.
 *
 * The IDAT chunks become one chunk and all other chunks are copied through in
 * order. The scanline filters are not touched, so the format is irrelevant.
 * Anything unexpected, or a result that is not smaller, returns the input.
 * Never throws.
 *
 * @param {Buffer} png
 * @returns {Buffer}
 */
export function recompressPng(png) {
  try {
    if (!png.subarray(0, SIGNATURE.length).equals(SIGNATURE)) {
      return png;
    }
    const parts = [SIGNATURE];
    const idat = [];
    let slot = -1;
    for (let pos = SIGNATURE.length; pos < png.length; ) {
      const end = pos + 12 + png.readUInt32BE(pos);
      if (end > png.length) {
        return png;
      }
      if (png.toString('latin1', pos + 4, pos + 8) === 'IDAT') {
        idat.push(png.subarray(pos + 8, end - 4));
        slot = slot < 0 ? parts.push(null) - 1 : slot;
      } else {
        parts.push(png.subarray(pos, end));
      }
      pos = end;
    }
    if (slot < 0) {
      return png;
    }
    const data = deflateSync(inflateSync(Buffer.concat(idat)), {level: 9});
    const chunk = Buffer.alloc(data.length + 12);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write('IDAT', 4, 'latin1');
    data.copy(chunk, 8);
    chunk.writeUInt32BE(crc32(chunk.subarray(4, chunk.length - 4)), chunk.length - 4);
    parts[slot] = chunk;
    const out = Buffer.concat(parts);
    return out.length < png.length ? out : png;
  } catch {
    return png;
  }
}
