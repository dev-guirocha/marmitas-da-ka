// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBygW-vehmCQtxL0enpJjzCxdu-ZlF64Jg",
  authDomain: "marmitas-da-ka.firebaseapp.com",
  projectId: "marmitas-da-ka",
  storageBucket: "marmitas-da-ka.appspot.com", // Usando o .appspot.com do seu "arquivo original"
  messagingSenderId: "985653739127",
  appId: "1:985653739127:web:657be410b5307fa5025072",
  measurementId: "G-KLTX7ZSR35"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize and export Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Configurações extras do Firestore que você incluiu no seu "arquivo original"
if (db?.settings) {
  db.settings({
    merge: true,
    experimentalForceLongPolling: true,
    useFetchStreams: false,
  });
}