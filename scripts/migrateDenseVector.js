const mongoose=require('mongoose')
const { toDenseVectorFloat32 }=require('../lib/embeddingUtil')
require('dotenv').config({path:'.env.local'})

async function run(){
 const backupName=`experiences_backup_${new Date().toISOString().replace(/[:.]/g,'-')}`
 const backupOnly=process.argv.includes('--backup-only')
 await mongoose.connect(process.env.MONGODB_URI)
 const dbName=process.env.MONGO_DB_NAME||'test'
 const db=mongoose.connection.client.db(dbName)
 const col=db.collection('experiences')
 console.log('Creating backup collection',backupName)
 await col.aggregate([{ $match:{} },{ $out: backupName }]).toArray()
 console.log('Backup complete')
 if(!backupOnly){
  const cursor=col.find({})
  let processed=0
  while(await cursor.hasNext()){
   const doc=await cursor.next()
   if(doc.embeddingBin){processed++;continue}
   const bin=toDenseVectorFloat32(doc.embedding)
   await col.updateOne({_id:doc._id},{ $set:{ embeddingBin:bin, updatedAt:new Date()} })
   processed++
   if(processed%5===0) console.log('Processed',processed)
  }
  console.log('Migration finished total',processed)
 }else{
  console.log('Backup-only flag detected. No migration performed.')
 }
 await mongoose.disconnect()
}
run().catch(err=>{console.error(err);process.exit(1)}) 