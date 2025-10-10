const admin = require('firebase-admin');
const fetch = require('node-fetch');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id: "unseen-93dd8",
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
    }),
  });
}
exports.handler = async (event) => {
  try {
    const { netlify_token } = JSON.parse(event.body);

    const response = await fetch('https://api.netlify.com/api/v1/user', {
      headers: { Authorization: `Bearer ${netlify_token}` },
    });
    const user = await response.json();

    if (!user || !user.id) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid Netlify user' }) };
    }

    const firebaseToken = await admin.auth().createCustomToken(user.id);
    return { statusCode: 200, body: JSON.stringify({ firebaseToken }) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
