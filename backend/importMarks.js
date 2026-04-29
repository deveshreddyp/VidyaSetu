const admin = require('firebase-admin');
const xlsx = require('xlsx');

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importMarks() {
  const wb = xlsx.readFile('../TYL UG Batch 2023-27.xlsx');
  const sheet = wb.Sheets['UG-AIDS'];
  const data = xlsx.utils.sheet_to_json(sheet, {header: 1, range: 0});
  
  const subjects = data[1];
  const maxMarks = data[2];
  const passMarks = data[3];

  let updateCount = 0;

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
      const snapshot = await db.collection('users').where('email', '==', email).get();
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await db.collection('users').doc(docId).update({
          results: results,
          usn: usn,
          name: name
        });
        updateCount++;
      } else {
        // Create user if not exist but was in sheet
        // This handles cases where they might not have been imported properly
        await db.collection('users').add({
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
        updateCount++;
      }
    }
  }

  console.log('Successfully updated marks for ' + updateCount + ' students.');
  process.exit(0);
}

importMarks().catch(err => {
  console.error(err);
  process.exit(1);
});
