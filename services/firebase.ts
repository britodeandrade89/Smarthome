import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from "firebase/firestore";
import { Reminder } from "../types";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrwC791rplIiqOeXKZTlCaacM8YhKkQdw",
  authDomain: "lista-de-compras-4420b.firebaseapp.com",
  projectId: "lista-de-compras-4420b",
  storageBucket: "lista-de-compras-4420b.firebasestorage.app",
  messagingSenderId: "457388372289",
  appId: "1:457388372289:web:f210e74b357e03ca5b71c0",
  measurementId: "G-DRMYGDKDDE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics safely (often blocked by ad-blockers)
let analytics;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Firebase Analytics falhou ao iniciar (provavelmente bloqueador de anúncios):", e);
}

const db = getFirestore(app);

// Collection Reference
const REMINDERS_COLLECTION = 'smart_home_reminders';

// Add a new reminder
export const addReminderToDB = async (text: string, type: 'alert' | 'action' | 'info' = 'info') => {
  try {
    console.log("Tentando adicionar lembrete ao Firestore:", text);
    await addDoc(collection(db, REMINDERS_COLLECTION), {
      text,
      type,
      createdAt: serverTimestamp(),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });
    console.log("Lembrete salvo com sucesso!");
    return true;
  } catch (e) {
    console.error("Erro ao salvar lembrete no Firebase: ", e);
    return false;
  }
};

// Subscribe to reminders (Real-time)
export const subscribeToReminders = (callback: (reminders: Reminder[]) => void) => {
  const q = query(collection(db, REMINDERS_COLLECTION), orderBy("createdAt", "desc"));
  
  return onSnapshot(q, 
    (snapshot) => {
      const reminders: Reminder[] = snapshot.docs.map(doc => ({
        text: doc.data().text,
        time: doc.data().time || '--:--',
        type: doc.data().type || 'info'
      }));
      console.log("Lembretes atualizados do Firestore:", reminders.length);
      callback(reminders);
    },
    (error) => {
      console.error("Erro na assinatura do Firestore (verifique regras de segurança ou conexão):", error);
    }
  );
};

export { app, analytics, db };