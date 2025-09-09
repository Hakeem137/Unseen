const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const crypto = require('crypto');
const fetch = globalThis.fetch || require('node-fetch');

const RATE_LIMIT_WINDOW = 60; // seconds
const MAX_PER_WINDOW = 5;
exports.submitMessage = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send({ error: 'Method Not Allowed' });

  try {
    const { toUsername, text, recaptchaToken } = req.body || {};
    if (!toUsername || !text || !recaptchaToken) return res.status(400).send({ error: 'Missing fields' });

    const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || '';
    if (!RECAPTCHA_SECRET) return res.status(500).send({ error: 'reCAPTCHA not configured' });

    // verify reCAPTCHA (v2 or v3)
    const recRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(RECAPTCHA_SECRET)}&response=${encodeURIComponent(recaptchaToken)}`
    });
    const recJson = await recRes.json();
    if (!recJson.success || (recJson.score !== undefined && recJson.score < 0.3)) {
      return res.status(400).send({ error: 'reCAPTCHA failed' });
    }
        // rate limit by IP (hashed) + username
    const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim() || 'unknown';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 64);
    const rlDocId = `rl_${toUsername}_${ipHash}`;
    const rlRef = db.collection('rate_limits').doc(rlDocId);
    const now = Date.now();

    await db.runTransaction(async (t) => {
      const snap = await t.get(rlRef);
      if (!snap.exists) {
        t.set(rlRef, { count: 1, windowStart: now });
      } else {
        const data = snap.data();
        if (!data.windowStart || (now - data.windowStart) > RATE_LIMIT_WINDOW * 1000) {
          t.set(rlRef, { count: 1, windowStart: now });
        } else {
          if (data.count >= MAX_PER_WINDOW) throw new Error('RATE_LIMIT_EXCEEDED');
          t.update(rlRef, { count: admin.firestore.FieldValue.increment(1) });
        }
      }
    });
        // basic blacklist (تعدل بالقائمة الحقيقية لاحقًا)
    const blacklist = ['badword1','badword2'];
    const lower = text.toLowerCase();
    for (const w of blacklist) {
      if (lower.includes(w)) return res.status(400).send({ error: 'Message contains forbidden content' });
    }

    // save message (admin SDK bypasses client rules)
    await db.collection('messages').add({
      to: toUsername,
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ipHash
    });
    return res.status(200).send({ ok: true });
  } catch (err) {
    console.error('submitMessage error:', err);
    if (err.message === 'RATE_LIMIT_EXCEEDED') return res.status(429).send({ error: 'Too many requests' });
    return res.status(500).send({ error: 'Server error' });
  }
};
