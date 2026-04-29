require('dotenv').config();
const { db } = require('./src/config/firebase');
const XLSX = require('xlsx');
const path = require('path');

const TARGET_SHEETS = ['UG-CSE', 'UG-ISE', 'UG-AIDS', 'UG-CSDS', 'UG-ECE', 'UG-AIML', 'UG-CSAIML'];

async function importRealData() {
  const filePath = path.resolve(__dirname, '../TYL UG Batch 2023-27.xlsx');
  console.log(`Reading Excel file from: ${filePath}...`);
  
  const workbook = XLSX.readFile(filePath);
  
  console.log('Deleting existing students...');
  const snapshot = await db.collection('users').where('role', '==', 'student').get();
  
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

  console.log('Parsing and importing complex real data...');
  let addBatch = db.batch();
  let addCount = 0;

  for (const sheetName of TARGET_SHEETS) {
    if (!workbook.SheetNames.includes(sheetName)) {
      console.warn(`WARNING: Sheet '${sheetName}' not found. Skipping.`);
      continue;
    }

    // Read as 2D array to handle the complex 4-row header
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    if (data.length < 5) continue; // Not enough rows

    const subjectCategories = data[0]; // Language Lx, Aptitude Ax...
    const subjectsRow = data[1];       // L1, L2, A1...
    const maxMarksRow = data[2];       // Max Marks
    const passingMarksRow = data[3];   // Passing Marks

    // Find the columns that represent valid subjects
    const validSubjectIndices = [];
    for (let i = 0; i < subjectsRow.length; i++) {
      const subjectName = subjectsRow[i];
      const passingMark = Number(passingMarksRow[i]);
      const maxMark = Number(maxMarksRow[i]);
      
      // If there's a valid subject name, max mark, and passing mark, register this column
      if (typeof subjectName === 'string' && !isNaN(passingMark) && !isNaN(maxMark)) {
        // Find category (it might be in a preceding merged cell, so we scan backwards in row 0)
        let category = 'Subject';
        for (let j = i; j >= 0; j--) {
          if (typeof subjectCategories[j] === 'string' && subjectCategories[j].trim() !== '') {
            category = subjectCategories[j].trim();
            break;
          }
        }
        
        validSubjectIndices.push({
          index: i,
          category: category,
          name: subjectName.trim(),
          max: maxMark,
          passing: passingMark
        });
      }
    }

    console.log(`Found ${validSubjectIndices.length} valid subjects in ${sheetName}.`);

    // Parse student rows (Row 4 onwards)
    for (let rowIndex = 4; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row || row.length === 0) continue;

      const email = String(row[1] || '').trim();
      const name = String(row[2] || '').trim();
      const usn = String(row[3] || '').trim();
      
      if (!email || !email.includes('@')) continue;

      const results = [];
      validSubjectIndices.forEach(subj => {
        const markValue = row[subj.index];
        if (typeof markValue === 'number' || (!isNaN(Number(markValue)) && String(markValue).trim() !== '')) {
          results.push({
            category: subj.category,
            subject: subj.name,
            mark: Number(markValue),
            max: subj.max,
            passingMark: subj.passing,
            isPass: Number(markValue) >= subj.passing
          });
        }
      });

      const newDocRef = db.collection('users').doc();
      addBatch.set(newDocRef, {
        email: email,
        name: name || email.split('@')[0],
        usn: usn,
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
  console.log(`Successfully imported ${addCount} students with perfect passing criteria!`);
  process.exit(0);
}

importRealData().catch(err => {
  console.error(err);
  process.exit(1);
});
