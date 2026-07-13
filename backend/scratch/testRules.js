const { admin } = require('../src/config/firebase');

const source = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

async function updateRules() {
  try {
    const ruleset = await admin.securityRules().createRuleset({
      name: 'firestore.rules',
      content: source
    });
    
    await admin.securityRules().releaseFirestoreRuleset(ruleset.name);
    console.log("Successfully updated Firestore security rules!");
    process.exit(0);
  } catch (err) {
    console.error("Error updating rules:", err.message);
    process.exit(1);
  }
}

updateRules();
