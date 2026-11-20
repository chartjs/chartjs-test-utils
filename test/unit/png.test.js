import assert from 'node:assert';
import {crc32, deflateSync, inflateSync} from 'node:zlib';
import {describe, it} from 'vitest';

import {recompressPng} from '../../src/png.js';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, out.length - 4)), out.length - 4);
  return out;
}

function chunksOf(png) {
  const list = [];
  for (let pos = 8; pos < png.length; pos += 12 + png.readUInt32BE(pos)) {
    list.push({
      type: png.toString('latin1', pos + 4, pos + 8),
      bytes: png.subarray(pos, pos + 12 + png.readUInt32BE(pos))
    });
  }
  return list;
}

/** A PNG of filtered rows; the filter bytes are what the browser would have chosen, not checked here. */
function makePng({idatChunks = 1, level = 1, middle = []} = {}) {
  const rows = Buffer.alloc(33 * 40, 7);
  const idat = deflateSync(rows, {level});
  const size = Math.ceil(idat.length / idatChunks);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(8, 0);
  ihdr.writeUInt32BE(40, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return {
    rows,
    png: Buffer.concat([
      SIGNATURE,
      chunk('IHDR', ihdr),
      ...middle,
      ...Array.from({length: idatChunks}, (_, i) => chunk('IDAT', idat.subarray(i * size, (i + 1) * size))),
      chunk('IEND', Buffer.alloc(0))
    ])
  };
}

const pixels = (png) =>
  inflateSync(
    Buffer.concat(
      chunksOf(png)
        .filter((c) => c.type === 'IDAT')
        .map((c) => c.bytes.subarray(8, -4))
    )
  );

describe('recompressPng', () => {
  it('keeps the filtered rows, in one IDAT chunk, with a correct CRC', () => {
    const {png, rows} = makePng({idatChunks: 3});
    const out = recompressPng(png);
    assert.ok(out.length < png.length);
    assert.ok(pixels(out).equals(rows));
    const idat = chunksOf(out).filter((c) => c.type === 'IDAT');
    assert.equal(idat.length, 1);
    assert.equal(idat[0].bytes.readUInt32BE(idat[0].bytes.length - 4), crc32(idat[0].bytes.subarray(4, -4)));
  });

  it('copies the other chunks through in order', () => {
    const middle = [chunk('gAMA', Buffer.from([0, 1, 0x86, 0xa0])), chunk('tEXt', Buffer.from('a\0b'))];
    const {png} = makePng({middle});
    const before = chunksOf(png).filter((c) => c.type !== 'IDAT');
    const after = chunksOf(recompressPng(png)).filter((c) => c.type !== 'IDAT');
    assert.deepEqual(after, before);
    assert.deepEqual(
      chunksOf(recompressPng(png)).map((c) => c.type),
      ['IHDR', 'gAMA', 'tEXt', 'IDAT', 'IEND']
    );
  });

  describe('returns the input unchanged', () => {
    const unchanged = (png) => assert.strictEqual(recompressPng(png), png);

    it('for something that is not a PNG', () => {
      unchanged(Buffer.from('not a png at all'));
      unchanged(Buffer.alloc(0));
    });

    it('for a truncated PNG', () => {
      unchanged(makePng().png.subarray(0, 60));
    });

    it('for corrupt pixel data', () => {
      const {png} = makePng({middle: [chunk('IDAT', Buffer.from('garbage'))]});
      unchanged(png);
    });

    it('when the result would not be smaller', () => {
      const once = recompressPng(makePng().png);
      assert.strictEqual(recompressPng(once), once);
    });
  });
});
