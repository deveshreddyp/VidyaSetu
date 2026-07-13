const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
// Option 1: Use GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
// Option 2: Use individual env vars (projectId, clientEmail, privateKey)
if (!admin.apps.length) {
  try {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      try {
        // If the JSON is provided directly as an environment variable (best for Railway/Vercel)
        const serviceAccount = JSON.parse(serviceAccountJson);
        // Defensively handle Vercel double-escaping the newlines in the JSON string
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } catch (e) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e.message);
        throw e;
      }
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
          projectId: process.env.FIREBASE_PROJECT_ID || 'vidyasetu-ai-2026',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      // Fallback: initialize with project ID only (works in GCP environments)
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'vidyasetu-ai-2026',
      });
    }
  } catch (error) {
    console.error("FIREBASE INITIALIZATION CRASHED:", error);
    // Initialize without credentials so Express can still boot and handle CORS requests
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: 'vidyasetu-ai-2026' });
    }
  }
}

const db = admin.firestore();

module.exports = { admin, db };
