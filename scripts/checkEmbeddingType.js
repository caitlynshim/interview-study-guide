const mongoose=require('mongoose')
require('dotenv').config({path:'.env.local'})

async function run(){
 await mongoose.connect(process.env.MONGODB_URI)
 const docs=await mongoose.connection.db.collection('experiences').aggregate([
  { $project:{ title:1, elemType:{ $type:{ $arrayElemAt:['$embedding',0] } } } },
  { $limit:10 }
 ]).toArray()
 console.log(docs.map(d=>`${d.title}: ${d.elemType}`))
 await mongoose.disconnect()
}
run().catch(console.error) 