require('dotenv').config();
const { db } = require('./src/config/firebase');
const XLSX = require('xlsx');
const path = require('path');

const TARGET_SHEETS = ['UG-CSE', 'UG-ISE', 'UG-AIDS', 'UG-CSDS', 'UG-ECE', 'UG-AIML'];

async function importRealData() {
  const filePath = path.resolve(__dirname, '../TYL UG Batch 2023-27.xlsx');
  console.log(`Reading Excel file from: ${filePath}...`);
  
  const workbook = XLSX.readFile(filePath);
  
  console.log('Deleting existing students...');
  const snapshot = await db.collection('users').where('role', '==', 'student').get();
  
  // Batch delete in chunks of 400
  let deleteBatch = db.batch();
  let deleteCount = 0;
  for (const doc of snapshot.docs) {
    deleteBatch.delete(doc.ref);
    deleteCount++;
    if (deleteCount % 400 === 0) {
      await deleteBatch.commit();
      deleteBatch = db.batch();
    }
  }
  if (deleteCount % 400 !== 0) await deleteBatch.commit();
  console.log(`Deleted ${deleteCount} previous student records.`);

  console.log('Parsing and importing real data...');
  let addBatch = db.batch();
  let addCount = 0;

  for (const sheetName of TARGET_SHEETS) {
    if (!workbook.SheetNames.includes(sheetName)) {
      console.warn(`WARNING: Sheet '${sheetName}' not found in Excel file. Skipping.`);
      continue;
    }

    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(`Found ${sheetData.length} rows in ${sheetName}.`);
    
    for (const row of sheetData) {
      const keys = Object.keys(row);
      const emailKey = keys.find(k => k.toLowerCase().includes('email'));
      const nameKey = keys.find(k => k.toLowerCase().includes('name'));
      const usnKey = keys.find(k => k.toLowerCase().includes('usn'));
      
      const email = emailKey && row[emailKey] ? String(row[emailKey]).trim() : null;
      if (!email) continue; // Skip rows without email

      const newDocRef = db.collection('users').doc();
      const results = [];
      
      keys.forEach(k => {
        const kl = k.toLowerCase();
        // Ignore personal details columns
        if (!kl.includes('email') && !kl.includes('name') && !kl.includes('usn') && !kl.includes('phone') && !kl.includes('mobile')) {
          if (typeof row[k] === 'number' || (!isNaN(Number(row[k])) && String(row[k]).trim() !== '')) {
            let max = 100;
            if (kl.includes('iat')) max = 50;
            
            const markValue = Number(row[k]);
            results.push({ 
              subject: k.trim(), 
              mark: markValue, 
              max: max,
              isPass: markValue >= (max * 0.4)
            });
          }
        }
      });

      addBatch.set(newDocRef, {
        email: email,
        name: nameKey && row[nameKey] ? String(row[nameKey]) : email.split('@')[0],
        usn: usnKey && row[usnKey] ? String(row[usnKey]) : '',
        role: 'student',
        section: sheetName,
        results: results,
        createdAt: new Date().toISOString()
      });

      addCount++;
      if (addCount % 400 === 0) {
        await addBatch.commit();
        addBatch = db.batch();
      }
    }
  }

  if (addCount % 400 !== 0) await addBatch.commit();
  console.log(`Successfully imported ${addCount} students with their marks to Firestore!`);
  process.exit(0);
}

importRealData().catch(err => {
  console.error(err);
  process.exit(1);
});
