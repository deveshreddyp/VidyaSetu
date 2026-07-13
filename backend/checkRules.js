const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function checkRules() {
  try {
    const page = await admin.securityRules().listRulesetMetadata();
    if (page.rulesets.length > 0) {
      const latest = page.rulesets[0];
      const ruleset = await admin.securityRules().getRuleset(latest.name);
      console.log(JSON.stringify(ruleset, null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}
checkRules();
