/**
 * Firebase Cloud Function: sendMessage
 * - Accepts POST { targetUsername, name, text, userAgent, origin }
 * - Finds user by username in `users` collection
 * - Rate-limits by IP (simple, stored in 'rateLimits' doc)
 * - Writes message into: users/{uid}/inbox/{messageId}
 * - Stores IP into moderation collection: moderation/ips/{messageId} (only readable by admins)
 *
 * Deploy with: firebase deploy --only functions
 *
 * NOTE: adjust region, project, and billing as needed.
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '20kb' }));

// simple helper: get IP from request (works with Cloud Functions / Cloud Run / Hosting rewrites)
function getRequestIP(req){
  // X-Forwarded-For may contain a list, take first
  const xf = req.headers['x-forwarded-for'];
  if(xf) return xf.split(',')[0].trim();
  if(req.ip) return req.ip;
  return null;
}

app.post('/sendMessage', async (req, res) => {
  try{
    const { targetUsername, name, text, userAgent, origin } = req.body || {};
    if(!targetUsername || !text) return res.status(400).json({ error: 'targetUsername and text are required' });

    // Map username -> uid (assumes users collection has 'username' field)
    const usersSnap = await db.collection('users').where('username', '==', targetUsername).limit(1).get();
    if(usersSnap.empty) return res.status(404).json({ error: 'Target user not found' });
    const userDoc = usersSnap.docs[0];
    const targetUid = userDoc.id;

    // Rate limiting by IP (very simple)
    const ip = getRequestIP(req) || 'unknown';
    const now = admin.firestore.Timestamp.now();
    const rDoc = db.collection('rateLimits').doc(ip);
    const rSnap = await rDoc.get();
    const RATE_WINDOW_SEC = 60; // 1 minute
    const MAX_PER_WINDOW = 6;
    if(rSnap.exists){
      const data = rSnap.data();
      const lastTs = data.last || admin.firestore.Timestamp.fromMillis(0);
      const count = (data.count || 0);
      const elapsed = now.seconds - lastTs.seconds;
      if(elapsed < RATE_WINDOW_SEC && count >= MAX_PER_WINDOW){
        return res.status(429).json({ error: 'Rate limit exceeded' });
      } else if(elapsed < RATE_WINDOW_SEC){
        await rDoc.set({ last: now, count: count + 1 }, { merge: true });
      } else {
        await rDoc.set({ last: now, count: 1 }, { merge: true });
      }
    } else {
      await rDoc.set({ last: now, count: 1 }, { merge: true });
    }

    // create message doc under user's inbox
    const msgRef = db.collection('users').doc(targetUid).collection('inbox').doc();
    const messageData = {
      text: text,
      fromName: name || null,
      createdAt: now,
      senderUid: null, // null because anonymous
      userAgent: null, // not exposed to recipient (we'll keep userAgent only in moderation)
      postedPublic: false,
      replied: false
    };
    await msgRef.set(messageData);

    // store sensitive metadata in moderation collection - accessible only to admins via security rules
    await db.collection('moderation').doc(msgRef.id).set({
      ip: ip,
      userAgent: userAgent || req.headers['user-agent'] || null,
      messageRef: msgRef.path,
      createdAt: now,
      origin: origin || null
    });

    return res.json({ ok: true, id: msgRef.id });
  }catch(err){
    console.error('sendMessage error', err);
    return res.status(500).json({ error: 'Internal error', details: err.message });
  }
});

// Expose Express app as single Cloud Function endpoint.
// When deploying, functions will contain sendMessage function.
// Use: https://<region>-<project>.cloudfunctions.net/api/sendMessage  (or configure hosting rewrites to /api/*)
exports.api = functions.region('us-central1').https.onRequest(app);
exports.sendMessage = functions.region('us-central1').https.onRequest(app); // convenience
