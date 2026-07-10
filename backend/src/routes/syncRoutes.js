const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { db, admin } = require('../config/firebase');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    console.log("Processing uploaded Excel file...");
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    
    // Match fast import logic
    const validSheets = [
      'UG-CSE', 'UG-ISE', 'UG-AIDS', 'UG-CSDS', 
      'UG-ECE', 'UG-AIML', 'UG-CSAIML'
    ];

    // Fetch existing users to avoid duplicate auth creation
    const usersSnap = await db.collection('users').get();
    const existingUsersMap = new Map();
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.email) {
        existingUsersMap.set(data.email, doc.ref);
      }
    });

    let addCount = 0;
    let updateCount = 0;
    let authCreatedCount = 0;
    const batchArray = [db.batch()];
    let operationCount = 0;

    for (const sheetName of sheetNames) {
      if (!validSheets.includes(sheetName)) continue;
      
      console.log(`Processing sheet: ${sheetName}`);
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      if (data.length < 5) continue;
      
      const headerRow = data[0];
      const subjectNames = data[1];
      const maxMarks = data[2];
      const passMarks = data[3];
      
      let emailIndex = -1;
      let nameIndex = -1;
      let usnIndex = -1;
      let sectionIndex = -1;
      let branchIndex = -1;

      for (let i = 0; i < headerRow.length; i++) {
        const h = String(headerRow[i] || '').toLowerCase();
        if (h.includes('email')) emailIndex = i;
        if (h.includes('name')) nameIndex = i;
        if (h.includes('usn')) usnIndex = i;
        if (h.includes('section')) sectionIndex = i;
        if (h.includes('branch')) branchIndex = i;
      }
      
      if (emailIndex === -1) continue;

      for (let r = 4; r < data.length; r++) {
        const row = data[r];
        if (!row || row.length === 0) continue;
        
        const email = row[emailIndex] ? String(row[emailIndex]).trim() : null;
        if (!email || !email.includes('@')) continue;

        const resultsMap = new Map();
        
        for (let c = 0; c < subjectNames.length; c++) {
          if (c === emailIndex || c < 5) continue; // Skip metadata columns
          
          let subjName = subjectNames[c];
          if (!subjName || typeof subjName !== 'string') continue;
          subjName = subjName.trim();
          
          if (subjName.toLowerCase().includes('level') || subjName.toLowerCase().includes('empty')) continue;
          
          // Feature requested: "there is no c5" -> completely ignore any subject with c5
          if (subjName.toLowerCase().includes('c5')) continue;
          
          const rawMarkVal = row[c];
          let markVal = parseFloat(rawMarkVal);
          let maxMark = parseFloat(maxMarks[c]);
          let passMark = parseFloat(passMarks[c]);
          
          if (subjName === 'C2 Full') maxMark = 25; // hardcoded fix
          
          let isAbsent = false;
          if (rawMarkVal === undefined || rawMarkVal === null || isNaN(markVal)) {
            if (!isNaN(maxMark) && !isNaN(passMark)) {
              markVal = 0;
              isAbsent = true;
            } else {
              continue; // skip if max/pass marks are invalid
            }
          }
          
          if (isNaN(maxMark) || isNaN(passMark)) continue;
          
          // Feature requested: "update the logic as if any one p3 is pass then it is pass"
          // We will merge all P3 subjects (e.g. P3-Python, P3-Java) into a single "P3" subject.
          if (subjName.toUpperCase().startsWith('P3')) {
            const isPass = markVal >= passMark;
            const existingP3 = resultsMap.get('P3');
            
            if (!existingP3) {
              resultsMap.set('P3', {
                subject: 'P3',
                mark: markVal,
                max: maxMark,
                pass: passMark,
                isPass: isPass,
                isAbsent: isAbsent
              });
            } else {
              // If ANY P3 is passed, the whole P3 group is passed
              if (isPass) {
                existingP3.isPass = true;
              }
              // Keep the highest mark among the P3 options
              if (markVal > existingP3.mark) {
                existingP3.mark = markVal;
                existingP3.isAbsent = isAbsent; // if highest mark is no longer absent
              }
            }
            continue;
          }
          
          resultsMap.set(subjName, {
            subject: subjName,
            mark: markVal,
            max: maxMark,
            pass: passMark,
            isPass: markVal >= passMark,
            isAbsent: isAbsent
          });
        }
        
        const results = Array.from(resultsMap.values());

        const name = nameIndex !== -1 && row[nameIndex] ? String(row[nameIndex]) : email.split('@')[0];
        const studentData = {
          email: email,
          name: name,
          usn: usnIndex !== -1 && row[usnIndex] ? String(row[usnIndex]) : '',
          section: sectionIndex !== -1 && row[sectionIndex] ? String(row[sectionIndex]) : sheetName,
          branch: branchIndex !== -1 && row[branchIndex] ? String(row[branchIndex]) : sheetName,
          role: 'student',
          results: results,
          updatedAt: new Date().toISOString()
        };

        // CREATE AUTH ACCOUNT (If not exists)
        if (!existingUsersMap.has(email)) {
          try {
            await admin.auth().createUser({
              email: email,
              password: 'password12345678', // Default password requested
              displayName: name,
            });
            authCreatedCount++;
          } catch (error) {
            if (error.code !== 'auth/email-already-exists') {
              console.error(`Auth creation failed for ${email}:`, error.message);
            }
          }
        }

        // DB BATCH WRITE
        const currentBatch = batchArray[batchArray.length - 1];
        if (existingUsersMap.has(email)) {
          currentBatch.set(existingUsersMap.get(email), studentData, { merge: true });
          updateCount++;
        } else {
          const newDocRef = db.collection('users').doc();
          currentBatch.set(newDocRef, { ...studentData, createdAt: new Date().toISOString() });
          addCount++;
          existingUsersMap.set(email, newDocRef); 
        }

        operationCount++;
        if (operationCount >= 490) { // Firestore batch limit
          batchArray.push(db.batch());
          operationCount = 0;
        }
      }
    }

    console.log(`Committing ${batchArray.length} batches to Firestore...`);
    for (const b of batchArray) {
      await b.commit();
    }

    const message = `Sync Complete! Updated ${updateCount} records, Added ${addCount} new records, Created ${authCreatedCount} new Auth accounts.`;
    console.log(message);
    
    return res.status(200).json({ success: true, message });
  } catch (error) {
    console.error("Upload Sync Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
