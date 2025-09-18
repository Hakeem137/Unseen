const fetch = require('node-fetch');
const admin = require('firebase-admin');

let initialized = false;
function initFirebase() {
  if (initialized) return;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT not set');
  }
  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  initialized = true;
}
exports.handler = async function(event) {
  try {
    initFirebase();

    const body = event.body ? JSON.parse(event.body) : {};
    const netlifyToken = body.netlify_token;
    if (!netlifyToken) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing netlify_token' }) };
    }

    const SITE_URL = process.env.SITE_URL;
    if (!SITE_URL) {
      return { statusCode: 500, body: JSON.stringify({ error: 'SITE_URL not configured' }) };
    }

    // Verify Netlify token by calling Netlify Identity user endpoint on your site
    const userRes = await fetch(`${SITE_URL}/.netlify/identity/user`, {
      headers: { 'Authorization': `Bearer ${netlifyToken}` }
    });
    if (!userRes.ok) {
      const text = await userRes.text();
      console.error('Netlify Identity verification failed:', userRes.status, text);
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid Netlify token' }) };
    }

    const netlifyUser = await userRes.json();
    // choose a stable UID for Firebase. Use netlifyUser.id or email as fallback.
    const uid = (netlifyUser.id || netlifyUser.uuid || netlifyUser.email || ('netlify:' + Date.now())).toString();

    // Optional: create or update a Firebase user record (not required for custom token creation)
    try {
      await admin.auth().getUser(uid);
    } catch (err) {
      // user doesn't exist, create a minimal user record
    try {
        await admin.auth().createUser({ uid, email: netlifyUser.email || undefined });
      } catch (createErr) {
        console.warn('Could not create Firebase user record:', createErr.message);
      }
    }

    // create Firebase custom token
    const firebaseToken = await admin.auth().createCustomToken(uid);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseToken })
    };
      } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
