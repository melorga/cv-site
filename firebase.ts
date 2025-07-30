// src/lib/firebase.ts
import { browser } from '$app/environment';

let app;
let auth;

export async function initFirebase() {
  if (!browser) {
    throw new Error('Firebase can only be initialized on the client-side');
  }

  // Dynamically import Firebase modules to avoid SSR issues
  const { initializeApp } = await import('firebase/app');
  const { getAuth } = await import('firebase/auth');

  const config = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);

  app = initializeApp(config);
  auth = getAuth(app);

  return { app, auth };
}

// Export getters to access them after init
export function getApp() {
  if (!app) throw new Error('Firebase not initialized');
  return app;
}

export function getFirebaseAuth() {
  if (!auth) throw new Error('Firebase not initialized');
  return auth;
}
