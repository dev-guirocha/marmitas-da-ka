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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize and export Firebase services
const auth = firebase.auth();
const db = firebase.firestore();