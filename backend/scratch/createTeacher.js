const { admin, db } = require('../src/config/firebase');

async function createTeacher() {
  const email = 'deveshreddypusalapati@gmail.com';
  const password = 'Orbit@123';

  try {
    // 1. Create in Firebase Auth
    console.log(`Creating Auth user for ${email}...`);
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: 'Devesh Reddy',
    });

    console.log('User created successfully:', userRecord.uid);

    // 2. Create in Firestore
    console.log('Creating Firestore document...');
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      role: 'teacher',
      name: 'Devesh Reddy',
      createdAt: new Date().toISOString()
    });

    console.log('Teacher account fully created!');
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('Email already exists! Updating role to teacher...');
      const user = await admin.auth().getUserByEmail(email);
      await db.collection('users').doc(user.uid).set({
        email: email,
        role: 'teacher',
        name: 'Devesh Reddy',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Also update the password just in case
      await admin.auth().updateUser(user.uid, { password: password });
      console.log('Teacher account fully updated!');
      process.exit(0);
    } else {
      console.error('Error creating new user:', error);
      process.exit(1);
    }
  }
}

createTeacher();
