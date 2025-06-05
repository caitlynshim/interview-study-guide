const { toDenseVectorFloat32 }=require('../lib/embeddingUtil')

describe('toDenseVectorFloat32',()=>{
 it('returns Binary length 6144 bytes',()=>{
  const arr=Array(1536).fill(0).map((_,i)=>i*0.001)
  const bin=toDenseVectorFloat32(arr)
  expect(bin.sub_type).toBe(0x81)
  expect(bin.buffer.length).toBe(1536*4)
 })
}) 