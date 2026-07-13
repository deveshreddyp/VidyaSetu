const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Read the rules from the actual firestore.rules file
const rulesPath = path.resolve(__dirname, '../../firestore.rules');
const source = fs.readFileSync(rulesPath, 'utf8');

console.log('Deploying rules:\n', source);

async function updateRules() {
  try {
    // Use the correct API: createRulesFileFromSource + createRuleset
    const rulesFile = admin.securityRules().createRulesFileFromSource(
      'firestore.rules',
      source
    );
    
    const ruleset = await admin.securityRules().createRuleset(rulesFile);
    
    await admin.securityRules().releaseFirestoreRuleset(ruleset.name);
    console.log("Successfully updated Firestore security rules!");
    process.exit(0);
  } catch (err) {
    console.error("Error updating rules:", err.message || err);
    process.exit(1);
  }
}

updateRules();
