const googleSheetsService = require('../services/googleSheetsService');
const { db, admin } = require('../config/firebase');

const syncStudentsFromSheet = async (req, res) => {
  try {
    console.log("Starting Google Sheets sync...");
    const sheetNames = await googleSheetsService.getSheetNames();
    
    // We only care about UG branch sheets, matching the fast import script
    const validSheets = [
      'UG-CSE', 'UG-ISE', 'UG-AIDS', 'UG-CSDS', 
      'UG-ECE', 'UG-AIML', 'UG-CSAIML'
    ];

    // Fetch existing users to avoid duplicate auth creation attempts
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
    const batchArray = [db.batch()];
    let operationCount = 0;
    let authCreatedCount = 0;

    for (const sheetName of sheetNames) {
      if (!validSheets.includes(sheetName)) continue;
      
      console.log(`Processing sheet: ${sheetName}`);
      const data = await googleSheetsService.getSheetData(sheetName);
      
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

        const results = [];
        
        for (let c = 0; c < subjectNames.length; c++) {
          if (c === emailIndex || c < 5) continue; // Skip metadata columns
          
          const subjName = subjectNames[c];
          const markVal = parseFloat(row[c]);
          let maxMark = parseFloat(maxMarks[c]);
          let passMark = parseFloat(passMarks[c]);
          
          if (subjName && typeof subjName === 'string') {
            if (subjName.trim() === 'C2 Full') maxMark = 25; // hardcoded fix
            
            if (!subjName.toLowerCase().includes('level') && !subjName.toLowerCase().includes('empty')) {
              if (!isNaN(markVal) && !isNaN(maxMark) && !isNaN(passMark)) {
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
        }

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
          // Immediately add to existing map to avoid duplicates in the same run
          existingUsersMap.set(email, newDocRef); 
        }

        operationCount++;
        if (operationCount >= 490) { // Firestore batch limit is 500
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
    
    if (res) {
      res.status(200).json({ success: true, message });
    }
  } catch (error) {
    console.error("Sync Error:", error);
    if (res) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = { syncStudentsFromSheet };
