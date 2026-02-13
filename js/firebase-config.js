// js/firebase-config.js

// Importar Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, setDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyC7E_fFYBdyIMfiqU_97Hh85RQibo-NxtU",
  authDomain: "movement-8f36b.firebaseapp.com",
  projectId: "movement-8f36b",
  storageBucket: "movement-8f36b.firebasestorage.app",
  messagingSenderId: "1072753898129",
  appId: "1:1072753898129:web:583c735a6b406a54970530"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Intentar sign-in anónimo para clientes no autenticados (permite writes cuando reglas requieren auth)
signInAnonymously(auth).then(() => {
  // no-op
}).catch((e) => {
  // en algunos contextos (admin) puede fallar; silenciar en prod
});

// Exportar para usar en otros archivos
window.firebase = {
  app,
  db,
  auth,
  collection,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInAnonymously
};

if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
  // evitar logs en producción
} else {
  console.log('🔥 Firebase inicializado correctamente (dev)');
}