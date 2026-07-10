/**
 * backfill_auth.js
 * 
 * Run this ONCE to create Firebase Auth accounts for all students who are
 * already in Firestore (from old imports) but missing from Firebase Auth.
 * 
 * Default password for all created accounts: password12345678
 * 
 * Usage:
 *   node src/backfill_auth.js
 */

require('dotenv').config();
const { db, admin } = require('./config/firebase');

async function backfillAuth() {
  console.log('Starting Auth backfill for existing Firestore users...\n');

  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} users in Firestore.\n`);

  let created = 0;
  let alreadyExists = 0;
  let errors = 0;

  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data();
    const email = data.email;
    const name = data.name || (email ? email.split('@')[0] : 'Student');

    if (!email || !email.includes('@')) {
      console.warn(`  Skipping doc ${docSnap.id} — no valid email`);
      continue;
    }

    try {
      await admin.auth().getUserByEmail(email);
      // Auth account already exists
      alreadyExists++;
      process.stdout.write('.');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        try {
          await admin.auth().createUser({
            email: email,
            password: 'password12345678',
            displayName: name,
          });
          created++;
          console.log(`  ✅ Created Auth account: ${email}`);
        } catch (createErr) {
          errors++;
          console.error(`  ❌ Failed to create ${email}:`, createErr.message);
        }
      } else {
        errors++;
        console.error(`  ❌ Unexpected error for ${email}:`, err.message);
      }
    }
  }

  console.log('\n\n=== Backfill Complete ===');
  console.log(`  Auth accounts already existed: ${alreadyExists}`);
  console.log(`  New Auth accounts created:     ${created}`);
  console.log(`  Errors:                        ${errors}`);
  process.exit(0);
}

backfillAuth();
