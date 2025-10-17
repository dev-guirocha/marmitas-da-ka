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

const ALLOWED_ORIGINS = [
  'https://marmitasdaka.com.br',
  'https://www.marmitasdaka.com.br',
  'https://dev-guirocha.github.io',
  'https://dev-guirocha.github.io/marmitas-da-ka',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

if (typeof window !== 'undefined') {
  const { origin } = window.location;
  if (!ALLOWED_ORIGINS.includes(origin)) {
    console.error(`[Firebase] Origem não autorizada (${origin}). Bloqueando inicialização.`);
    throw new Error('Origem não autorizada para o Firebase. Atualize ALLOWED_ORIGINS em firebase-config.js.');
  }
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Ative o App Check quando você registrar a chave pública no console
if (typeof firebase !== 'undefined' && firebase?.appCheck && window?.__APP_CHECK_PUBLIC_KEY__) {
  try {
    firebase.appCheck().activate(window.__APP_CHECK_PUBLIC_KEY__, true);
  } catch (err) {
    console.warn('Não foi possível ativar o Firebase App Check:', err);
  }
}

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
