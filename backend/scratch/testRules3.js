const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const sourceStr = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

async function test() {
  try {
    const ruleset = await admin.securityRules().createRuleset(sourceStr);
    console.log("Success!", ruleset.name);
    process.exit(0);
  } catch(e) {
    console.error(e.message);
    process.exit(1);
  }
}
test();
