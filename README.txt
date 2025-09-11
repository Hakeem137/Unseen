Unseen - Anonymous messages (minimal implementation)
---------------------------------------------------
Files included:
- index.html               : Front-end single page (place in Hosting 'public' folder)
- functions/index.js      : Cloud Function (Express) that accepts anonymous messages and stores IP to moderation
- functions/package.json  : Node dependencies for functions
- firestore.rules         : Example Firestore security rules
- firebase.json           : Hosting config with rewrites to functions
- README.txt              : this file

Quick setup:
1. Install Firebase CLI and initialize hosting + functions: `firebase init hosting functions firestore`
2. Replace firebaseConfig in `index.html` with your own project's credentials.
3. Put index.html into `public/` folder.
4. Place the contents of functions/ into your functions directory.
5. Deploy: `firebase deploy --only hosting,functions`
   - The function is exposed as HTTPS at: https://<region>-<project>.cloudfunctions.net/api/sendMessage
   - Using firebase.json rewrite, client can call '/api/sendMessage' relative to site origin.

Security & notes:
- The Cloud Function captures the request IP and writes it to `moderation/{messageId}` while the message user-visible document is stored under `users/{uid}/inbox/{messageId}` without IP.
- Firestore rules restrict `moderation` reads to admins only (users docs should include isAdmin:true).
- Rate limiting in the function is simple and uses a rateLimits collection keyed by IP. Consider more robust solutions for production.
- In production, always validate content (profanity filtering), apply stronger rate limits, and monitor abusive patterns.
