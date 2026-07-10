require('dotenv').config();
const { db } = require('./config/firebase');
const xlsx = require('xlsx');
const path = require('path');

async function importAllStudentsFast() {
  console.log("Starting FAST forced import of ALL students from Excel...");
  
  const filePath = path.resolve(__dirname, '../../TYL UG Batch 2023-27.xlsx');
  const workbook = xlsx.readFile(filePath);
  
  const validSheets = [
    'UG-CSE', 'UG-ISE', 'UG-AIDS', 'UG-CSDS', 
    'UG-ECE', 'UG-AIML', 'UG-CSAIML'
  ];
  
  // Fetch all existing users into a Map to avoid individual queries
  console.log("Fetching existing users...");
  const usersSnap = await db.collection('users').get();
  const existingUsersMap = new Map();
  usersSnap.forEach(doc => {
    const data = doc.data();
    if (data.email) {
      existingUsersMap.set(data.email, doc.ref);
    }
  });
  console.log(`Found ${existingUsersMap.size} existing users.`);

  let addCount = 0;
  let updateCount = 0;
  const batchArray = [db.batch()];
  let operationCount = 0;

  for (const sheetName of validSheets) {
    if (!workbook.SheetNames.includes(sheetName)) continue;
    
    console.log(`Processing sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
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
        let maxMark = maxMarks[c];
        let passMark = passMarks[c];
        
        // HARDCODE FIX: If subject is "C2 Full", enforce max = 25
        if (subjName && typeof subjName === 'string') {
          if (subjName.trim() === 'C2 Full') {
             maxMark = 25;
          }
        }

        if (subjName && typeof subjName === 'string' && !subjName.toLowerCase().includes('level') && !subjName.toLowerCase().includes('empty')) {
          if (typeof markVal === 'number' && typeof maxMark === 'number' && typeof passMark === 'number') {
            results.push({
              subject: subjName.trim(),
              mark: markVal,
              max: maxMark,
              pass: passMark,
              isPass: markVal >= passMark
            });
          }
        }
      }

      if (results.length > 0) {
        const nameCol = data[0].findIndex(h => String(h).toLowerCase().includes('name'));
        const usnCol = data[0].findIndex(h => String(h).toLowerCase().includes('usn'));

        const studentData = {
          email: email,
          name: nameCol !== -1 && row[nameCol] ? String(row[nameCol]) : email.split('@')[0],
          usn: usnCol !== -1 && row[usnCol] ? String(row[usnCol]) : '',
          role: 'student',
          section: sheetName,
          results: results,
          updatedAt: new Date().toISOString()
        };

        const currentBatch = batchArray[batchArray.length - 1];

        if (existingUsersMap.has(email)) {
          currentBatch.set(existingUsersMap.get(email), studentData, { merge: true });
          updateCount++;
        } else {
          const newDocRef = db.collection('users').doc();
          currentBatch.set(newDocRef, { ...studentData, createdAt: new Date().toISOString() });
          addCount++;
        }

        operationCount++;
        if (operationCount === 490) {
          batchArray.push(db.batch());
          operationCount = 0;
        }
      }
    }
  }

  console.log(`Committing ${batchArray.length} batches to Firestore...`);
  for (const b of batchArray) {
    await b.commit();
  }

  console.log(`Finished FAST! Updated ${updateCount} students, Added ${addCount} new students.`);
  process.exit(0);
}

importAllStudentsFast();
