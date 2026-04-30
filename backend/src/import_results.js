require('dotenv').config();
const { admin, db } = require('./config/firebase');
const xlsx = require('xlsx');
const path = require('path');

const auth = admin.auth();

async function cleanAndImportResults() {
  console.log("Starting results import and cleanup...");
  
  const filePath = path.resolve(__dirname, '../../TYL UG Batch 2023-27.xlsx');
  const workbook = xlsx.readFile(filePath);
  
  // ONLY process the valid department sheets
  const validSheets = [
    'UG-CSE', 'UG-ISE', 'UG-AIDS', 'UG-CSDS', 
    'UG-ECE', 'UG-AIML', 'UG-CSAIML'
  ];
  
  let updateCount = 0;

  for (const sheetName of validSheets) {
    if (!workbook.SheetNames.includes(sheetName)) continue;
    
    console.log(`Processing valid sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    // Read as 2D array
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    if (data.length < 5) continue;
    
    const subjectNames = data[1]; // Row 2
    const maxMarks = data[2];     // Row 3
    const passMarks = data[3];    // Row 4
    
    let emailIndex = -1;
    for (let i = 0; i < data[0].length; i++) {
      if (String(data[0][i]).toLowerCase().includes('email')) {
        emailIndex = i;
        break;
      }
    }
    
    if (emailIndex === -1) continue;

    for (let r = 4; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;
      
      const email = row[emailIndex] ? String(row[emailIndex]).trim() : null;
      if (!email || !email.includes('@')) continue;

      const results = [];
      
      for (let c = 0; c < subjectNames.length; c++) {
        if (c === emailIndex || c < 5) continue;
        
        const subjName = subjectNames[c];
        const markVal = row[c];
        const maxMark = maxMarks[c];
        const passMark = passMarks[c];
        
        if (subjName && typeof subjName === 'string' && !subjName.toLowerCase().includes('level') && !subjName.toLowerCase().includes('empty')) {
          if (typeof markVal === 'number' && typeof maxMark === 'number' && typeof passMark === 'number') {
            results.push({
              subject: subjName.trim(),
              mark: markVal,
              max: maxMark,
              isPass: markVal >= passMark
            });
          }
        }
      }

      if (results.length > 0) {
        try {
          const userRecord = await auth.getUserByEmail(email);
          const uid = userRecord.uid;
          
          // Overwrite with clean results, remove Consolidated section
          await db.collection('users').doc(uid).set({
            results: results,
            section: sheetName,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          await db.collection('students').doc(uid).set({
            results: results,
            section: sheetName,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          updateCount++;
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  console.log(`Finished fixing and importing results! Successfully updated ${updateCount} students.`);
  process.exit(0);
}

cleanAndImportResults();
