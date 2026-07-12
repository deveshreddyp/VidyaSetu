require('dotenv').config();
const { db, admin } = require('./src/config/firebase');

async function forceUpdatePasswords() {
  console.log('Force-updating all student passwords to password12345678...');
  
  const usersSnap = await db.collection('users').where('role', '==', 'student').get();
  console.log(`Found ${usersSnap.size} students in Firestore.`);

  let updated = 0;
  let errors = 0;

  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data();
    const email = data.email;
    
    if (!email || !email.includes('@')) continue;

    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(user.uid, { password: 'password12345678' });
      updated++;
      process.stdout.write('.');
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        errors++;
        console.error(`\nFailed to update ${email}:`, err.message);
      }
    }
  }

  console.log(`\n\n=== Password Reset Complete ===`);
  console.log(`Successfully updated ${updated} accounts to password12345678`);
  console.log(`Errors: ${errors}`);
  process.exit(0);
}

forceUpdatePasswords();
