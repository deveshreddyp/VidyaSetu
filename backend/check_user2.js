const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkUser() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', 'deveshreddypusalapati@gmail.com').get();
  
  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }
  
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}

checkUser().catch(console.error);
