// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO_ID",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID",
  measurementId: "SEU_MEASUREMENT_ID" // Opcional
};

const ALLOWED_ORIGINS = [
  'https://seu-dominio.com',
  'https://www.seu-dominio.com',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

if (typeof window !== 'undefined') {
  const { origin, hostname } = window.location;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  if (!isLocalHost && !ALLOWED_ORIGINS.includes(origin)) {
    console.error(`[Firebase] Origem não autorizada (${origin}). Atualize ALLOWED_ORIGINS com os domínios liberados.`);
    throw new Error('Origem não autorizada para o Firebase.');
  }
  if (isLocalHost) {
    console.info('[Firebase] Ambiente local detectado. Ignorando verificação de origem.');
  }
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Ative o App Check quando você obtiver a chave pública no console do Firebase
if (typeof firebase !== 'undefined' && firebase?.appCheck && window?.__APP_CHECK_PUBLIC_KEY__) {
  firebase.appCheck().activate(window.__APP_CHECK_PUBLIC_KEY__, true);
}

// Initialize and export Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
