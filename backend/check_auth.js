const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function checkAuthUser() {
  try {
    const userRecord = await admin.auth().getUserByEmail('deveshreddypusalapati@gmail.com');
    console.log('Auth UID:', userRecord.uid);
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
}

checkAuthUser();
