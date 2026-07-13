const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function checkDevesh() {
  const snapshot = await admin.firestore().collection('users').where('email', '==', 'deveshreddypusalapati@gmail.com').get();
  snapshot.forEach(doc => {
    console.log(doc.id, "=>", doc.data());
  });
  process.exit(0);
}
checkDevesh();
