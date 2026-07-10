require('dotenv').config();
const { db } = require('./config/firebase');

async function cleanConsolidated() {
  console.log("Starting cleanup of 'Consolidated' section...");
  let count = 0;
  
  // 1. Delete all users where section == 'Consolidated'
  const snapshot = await db.collection('users').where('section', '==', 'Consolidated').get();
  
  const batch = db.batch();
  snapshot.forEach(doc => {
    batch.delete(doc.ref);
    count++;
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`Deleted ${count} invalid 'Consolidated' user records.`);
  } else {
    console.log("No 'Consolidated' records found.");
  }
  
  process.exit(0);
}

cleanConsolidated();
