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
  // apiKey: "AIzaSyCqfCxxxxxx",
  // authDomain: "myproject.firebaseapp.com",
  // projectId: "myproject",
  // storageBucket: "myproject.appspot.com",
  // messagingSenderId: "109999999999",
  // appId: "1:109999999999:web:abcd1234abcd1234"

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
