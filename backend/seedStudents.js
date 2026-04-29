require('dotenv').config();
const { db } = require('./src/config/firebase');

const SECTIONS = ['UG-CSE', 'UG-ISE', 'UG-AIDS', 'UG-CSDS', 'UG-ECE', 'UG-AIML'];
const NAMES = ['Aarav', 'Vihaan', 'Vivaan', 'Ananya', 'Diya', 'Advik', 'Kabir', 'Anika', 'Navya', 'Ojasvi', 'Dhruv', 'Ayaan', 'Ishaan', 'Aadhya', 'Krish', 'Riya', 'Aarohi', 'Samar', 'Myra', 'Aryan'];

const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
  console.log('Deleting existing students...');
  const snapshot = await db.collection('users').where('role', '==', 'student').get();
  
  // Batch delete in chunks of 500 max
  let batch = db.batch();
  let deleteCount = 0;
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    deleteCount++;
    if (deleteCount % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (deleteCount % 400 !== 0) await batch.commit();
  
  console.log('Deleted', snapshot.size, 'students.');

  console.log('Seeding new students...');
  let addBatch = db.batch();
  let count = 0;

  SECTIONS.forEach((section, sIdx) => {
    // Generate 12 students per section
    for(let i = 0; i < 12; i++) {
      const name = NAMES[random(0, NAMES.length - 1)] + ' ' + String.fromCharCode(65 + random(0, 25));
      const usn = `1CR22${section.split('-')[1].slice(0, 2)}${random(10, 99)}`;
      const email = `${name.split(' ')[0].toLowerCase()}.${usn.toLowerCase()}@cmrit.ac.in`;

      // Random realistic performance variation
      const isWeak = random(1, 10) > 8; // 20% chance of weak student
      const minMark = isWeak ? 10 : 35;
      const maxMark = isWeak ? 30 : 50;
      const minQ = isWeak ? 30 : 70;
      const maxQ = isWeak ? 60 : 100;

      const results = [
        { subject: 'Algorithms IAT', mark: random(minMark, maxMark), max: 50 },
        { subject: 'Operating Systems IAT', mark: random(minMark, maxMark), max: 50 },
        { subject: 'Computer Networks', mark: random(minQ, maxQ), max: 100 },
        { subject: 'Machine Learning', mark: random(minQ, maxQ), max: 100 },
      ].map(r => ({ ...r, isPass: r.mark >= (r.max * 0.4) }));

      const docRef = db.collection('users').doc();
      addBatch.set(docRef, {
        name,
        email,
        usn,
        role: 'student',
        section,
        results,
        createdAt: new Date().toISOString()
      });
      count++;
    }
  });

  await addBatch.commit();
  console.log(`Successfully seeded ${count} students across all sections!`);
  process.exit(0);
}

seed().catch(console.error);
