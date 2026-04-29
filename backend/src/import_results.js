require('dotenv').config();
const { admin, db } = require('./config/firebase');
const xlsx = require('xlsx');
const path = require('path');

const auth = admin.auth();

async function importResults() {
  console.log("Starting results import...");
  
  const filePath = path.resolve(__dirname, '../../TYL UG Batch 2023-27.xlsx');
  const workbook = xlsx.readFile(filePath);
  
  let updateCount = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    for (const row of sheetData) {
      const keys = Object.keys(row);
      const emailKey = keys.find(k => k.toLowerCase().includes('email'));
      
      const email = emailKey && row[emailKey] ? String(row[emailKey]).trim() : null;
      if (!email) continue;

      const results = [];
      keys.forEach(k => {
        const kl = k.toLowerCase();
        if (!kl.includes('email') && !kl.includes('name') && !kl.includes('usn') && !kl.includes('phone') && !kl.includes('mobile')) {
          if (typeof row[k] === 'number' || (!isNaN(Number(row[k])) && String(row[k]).trim() !== '')) {
            let max = 100;
            if (kl.includes('iat')) max = 50;
            const markValue = Number(row[k]);
            results.push({ 
              subject: k, 
              mark: markValue, 
              max: max,
              isPass: markValue >= (max * 0.4)
            });
          }
        }
      });

      if (results.length > 0) {
        try {
          const userRecord = await auth.getUserByEmail(email);
          const uid = userRecord.uid;
          
          await db.collection('users').doc(uid).set({
            results: results,
            section: sheetName,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          // Also merge results into students collection to keep things consistent
          await db.collection('students').doc(uid).set({
            results: results,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          updateCount++;
          console.log(`Updated results for: ${email}`);
        } catch (e) {
          console.error(`Error updating results for ${email}:`, e.message);
        }
      }
    }
  }

  console.log(`Finished importing results! Successfully updated ${updateCount} students.`);
  process.exit(0);
}

importResults();
