import fs from 'node:fs'
import zlib from 'node:zlib'

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size)
      const i = row + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function crc(buf) {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return ~c >>> 0
}

function icon(x, y, size) {
  const nx = x / (size - 1)
  const ny = y / (size - 1)
  const inRound = nx > 0.08 && nx < 0.92 && ny > 0.08 && ny < 0.92
  if (!inRound) return [0, 0, 0, 0]
  const paper = nx > 0.28 && nx < 0.78 && ny > 0.22 && ny < 0.78
  const spine = nx > 0.46 && nx < 0.5 && ny > 0.22 && ny < 0.78
  const lamp = (nx - 0.72) ** 2 + (ny - 0.3) ** 2 < 0.012
  if (lamp) return [225, 90, 69, 255]
  if (spine) return [198, 161, 90, 255]
  if (paper) return [246, 241, 231, 255]
  return [36, 28, 22, 255]
}

fs.mkdirSync('public', { recursive: true })
fs.writeFileSync('public/icon-192.png', png(192, icon))
fs.writeFileSync('public/icon-512.png', png(512, icon))
