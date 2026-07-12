const { admin } = require('../src/config/firebase');

const source = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read their own document
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      // Allow teachers to read all users (to see students)
      allow read, write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
      // For creating accounts during signup
      allow create: if request.auth != null;
    }
    
    // Default deny for other collections for now, or allow authenticated users to read
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
  }
}
`;

async function updateRules() {
  try {
    const ruleset = await admin.securityRules().createRuleset({
      files: [{
        name: 'firestore.rules',
        content: source
      }]
    });
    
    await admin.securityRules().releaseFirestoreRuleset(ruleset.name);
    console.log("Successfully updated Firestore security rules!");
    process.exit(0);
  } catch (err) {
    console.error("Error updating rules:", err);
    process.exit(1);
  }
}

updateRules();
