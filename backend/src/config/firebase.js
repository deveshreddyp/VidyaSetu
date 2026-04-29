const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
// Option 1: Use GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
// Option 2: Use individual env vars (projectId, clientEmail, privateKey)
if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountPath) {
    const absolutePath = path.resolve(process.cwd(), serviceAccountPath);
    const serviceAccount = require(absolutePath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Fallback: initialize with project ID only (works in GCP environments)
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'vidyasetu-ai',
    });
  }
}

const db = admin.firestore();

module.exports = { admin, db };
