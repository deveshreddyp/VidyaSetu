const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function checkAuthUsers() {
  try {
    const userRecord = await admin.auth().getUserByEmail('deveshreddypusalapati@gmail.com');
    console.log("Found in Auth by exact email:", userRecord.uid, userRecord.providerData);
  } catch (err) {
    console.log("Not found by exact email.");
  }
  
  // List all users to check for typos
  const listUsersResult = await admin.auth().listUsers(1000);
  listUsersResult.users.forEach((userRecord) => {
    if (userRecord.email && userRecord.email.includes('devesh')) {
      console.log('Match in Auth:', userRecord.uid, userRecord.email, userRecord.providerData);
    }
  });

  process.exit(0);
}

checkAuthUsers();
