const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
// Option 1: Use GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
// Option 2: Use individual env vars (projectId, clientEmail, privateKey)
if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    // If the JSON is provided directly as an environment variable (best for Railway/Vercel)
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (serviceAccountPath) {
    // If a file path is provided (best for Render or local development)
    const absolutePath = path.resolve(process.cwd(), serviceAccountPath);
    const serviceAccount = require(absolutePath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    // If individual variables are provided
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
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
