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

  // Default Firebase config for development
  // In production, you'd set VITE_FIREBASE_CONFIG environment variable
  let config;
  try {
    config = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}');
    console.log('Firebase config loaded from environment');
  } catch (e) {
    console.log('Using default Firebase config for development');
    // Default config - replace with your actual Firebase project config
    config = {
      apiKey: "your-api-key",
      authDomain: "your-project.firebaseapp.com",
      projectId: "your-project-id",
      storageBucket: "your-project.appspot.com",
      messagingSenderId: "123456789",
      appId: "your-app-id"
    };
  }

  if (!config.apiKey || config.apiKey === 'your-api-key') {
    throw new Error('Firebase configuration not properly set. Please configure VITE_FIREBASE_CONFIG environment variable.');
  }

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
