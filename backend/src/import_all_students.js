require('dotenv').config();
const { db } = require('./config/firebase');
const xlsx = require('xlsx');
const path = require('path');

async function importAllStudents() {
  console.log("Starting forced import of ALL students from Excel...");
  
  const filePath = path.resolve(__dirname, '../../TYL UG Batch 2023-27.xlsx');
  const workbook = xlsx.readFile(filePath);
  
  const validSheets = [
    'UG-CSE', 'UG-ISE', 'UG-AIDS', 'UG-CSDS', 
    'UG-ECE', 'UG-AIML', 'UG-CSAIML'
  ];
  
  let addCount = 0;
  let updateCount = 0;

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
        const passMark = passMarks[c];
        
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

        const emailQuery = await db.collection('users').where('email', '==', email).get();
        if (!emailQuery.empty) {
          const docId = emailQuery.docs[0].id;
          await db.collection('users').doc(docId).set(studentData, { merge: true });
          updateCount++;
        } else {
          await db.collection('users').add({ ...studentData, createdAt: new Date().toISOString() });
          addCount++;
        }
      }
    }
  }

  console.log(`Finished! Updated ${updateCount} students, Added ${addCount} new students.`);
  process.exit(0);
}

importAllStudents();
