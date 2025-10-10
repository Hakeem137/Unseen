// بنستورد مكتبات Firebase (من السيرفر الرسمي)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
const firebaseConfig = {
  // 🔸 مثال:
  apiKey: "AIzaSyB7uWrWJ1v_o3fqx0442wIkrAfTnPn84Mo",
  authDomain: "unseen-93dd8.firebaseapp.com",
  projectId: "unseen-93dd8",
storageBucket: "unseen-93dd8.appspot.com",
  messagingSenderId: "142670337449",
  appId: "1:142670337449:web:f41e9b5ebbb433378060b8",
  measurementId: "G-SPL7YN9LZ1"

  // ⚠️ ملاحظة: احذف التعليقات وحط بياناتك الحقيقية من Firebase هنا
};
const app = initializeApp(firebaseConfig);

// بنشغل نظام الدخول (Authentication)
const auth = getAuth(app);

// بنشغل قاعدة البيانات (Firestore)
const db = getFirestore(app);


// 🟢 تسجيل دخول تلقائي كمستخدم مجهول (Anonymous login)
signInAnonymously(auth)
  .then(() => {
    console.log("✅ تم تسجيل الدخول كمستخدم مجهول بنجاح");
  })
  .catch((error) => {
    console.error("❌ حصل خطأ أثناء تسجيل الدخول:", error);
  });
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("👤 مستخدم متصل:", user.uid);

    // بننشئ أو نحدث مستند المستخدم في Firestore
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      createdAt: serverTimestamp(),
      displayName: "Anonymous User",
    }, { merge: true });

    console.log("📁 تم إنشاء/تحديث مستند المستخدم في Firestore");
  } else {
    console.log("🚪 المستخدم غير مسجل حاليًا");
  }
});
export { app };
