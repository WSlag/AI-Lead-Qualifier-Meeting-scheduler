import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.appId
  );
}

let dbInstance: ReturnType<typeof getFirestore> | null = null;

export function getDb() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Set the VITE_FIREBASE_* environment variables."
    );
  }
  if (!dbInstance) {
    const app = initializeApp(config);
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}