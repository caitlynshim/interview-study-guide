const { Binary } = require('mongodb')

/**
 * Convert a JS number[] (float64/float32) to BSON Binary subtype 0x81 (DenseVector Float32)
 * @param {number[]} arr length 1536
 * @returns {Binary}
 */
function toDenseVectorFloat32 (arr) {
  const float32 = new Float32Array(arr)
  return new Binary(Buffer.from(float32.buffer), 0x81)
}

module.exports = { toDenseVectorFloat32 } 