const admin = require('firebase-admin');
const xlsx = require('xlsx');

const serviceAccount = require('./serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function importMarksBatch() {
  const wb = xlsx.readFile('../TYL UG Batch 2023-27.xlsx');
  const sheet = wb.Sheets['UG-AIDS'];
  const data = xlsx.utils.sheet_to_json(sheet, {header: 1, range: 0});
  
  const subjects = data[1];
  const maxMarks = data[2];
  const passMarks = data[3];

  let updateCount = 0;
  let batch = db.batch();
  let batchCount = 0;

  console.log('Fetching existing users...');
  const usersSnapshot = await db.collection('users').get();
  const emailToUser = {};
  usersSnapshot.forEach(doc => {
    emailToUser[doc.data().email] = doc;
  });

  console.log('Processing sheet...');
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[1]) continue;

    const email = row[1].toString().trim();
    const usn = row[3] ? row[3].toString().trim() : '';
    const name = row[2] ? row[2].toString().trim() : '';

    const results = [];
    for (let j = 7; j <= 33; j++) {
      if (subjects[j] && row[j] !== undefined && row[j] !== null && row[j] !== '') {
        const mark = Number(row[j]);
        const max = Number(maxMarks[j]);
        const pass = Number(passMarks[j]);
        
        results.push({
          subject: subjects[j],
          mark: isNaN(mark) ? row[j] : mark,
          max: isNaN(max) ? 100 : max,
          pass: isNaN(pass) ? 50 : pass,
          isPass: isNaN(mark) ? false : (mark >= pass)
        });
      }
    }

    if (results.length > 0) {
      const existingUser = emailToUser[email];
      
      if (existingUser) {
        batch.update(existingUser.ref, {
          results: results,
          usn: usn,
          name: name
        });
        batchCount++;
        updateCount++;
      } else {
        const newRef = db.collection('users').doc();
        batch.set(newRef, {
          email,
          name,
          usn,
          role: 'student',
          section: row[6] ? row[6].toString().trim() : 'A',
          classroom: 'UG-AIDS',
          mentor: 'k.vidhyavati@cmrit.ac.in',
          results: results,
          password: '12345678',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        batchCount++;
        updateCount++;
      }

      if (batchCount === 450) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
        console.log('Committed batch up to row', i);
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log('Successfully updated marks for ' + updateCount + ' students.');
  process.exit(0);
}

importMarksBatch().catch(err => {
  console.error(err);
  process.exit(1);
});
