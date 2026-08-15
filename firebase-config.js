import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBtmBz0ZelsxEnHZe7rsSctXiktrKvHppk',
  authDomain: 'stellaris-airlines-web.firebaseapp.com',
  projectId: 'stellaris-airlines-web',
  storageBucket: 'stellaris-airlines-web.firebasestorage.app',
  messagingSenderId: '809373770216',
  appId: '1:809373770216:web:cd43847b82718e3b67c45d',
  measurementId: 'G-057X7H7YTR'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, firebaseConfig };
