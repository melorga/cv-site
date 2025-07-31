// src/lib/firebase.ts
import { browser } from '$app/environment';

let app;
let auth;
let isInitialized = false;

export async function initFirebase() {
  if (!browser) {
    throw new Error('Firebase can only be initialized on the client-side');
  }

  // Return existing instance if already initialized
  if (isInitialized && app && auth) {
    return { app, auth };
  }

  try {
    // Dynamically import Firebase modules to avoid SSR issues
    const { initializeApp } = await import('firebase/app');
    const { getAuth, connectAuthEmulator } = await import('firebase/auth');

    // Try to get Firebase config from environment
    let config;
    const envConfig = import.meta.env.VITE_FIREBASE_CONFIG;
    
    if (envConfig) {
      try {
        config = JSON.parse(envConfig);
        console.log('🔥 Firebase config loaded from environment');
      } catch (parseError) {
        console.error('❌ Failed to parse VITE_FIREBASE_CONFIG:', parseError);
        throw new Error('Invalid Firebase configuration format');
      }
    } else {
      // Development mode - allow fallback for demo purposes
      console.log('⚠️  No Firebase config found, running in development mode');
      
      // Check if we have individual environment variables
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      
      if (apiKey && authDomain && projectId) {
        config = {
          apiKey,
          authDomain,
          projectId,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
          appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id"
        };
        console.log('🔥 Firebase config assembled from individual env vars');
      } else {
        // Throw error for production, but allow development mode
        if (import.meta.env.PROD) {
          throw new Error('Firebase configuration not found. Please set VITE_FIREBASE_CONFIG or individual Firebase environment variables.');
        } else {
          // Development fallback - will fail authentication but allow UI testing
          console.log('🚧 Running in demo mode - authentication will not work');
          throw new Error('DEV_MODE_NO_FIREBASE');
        }
      }
    }

    // Validate required config fields
    if (!config.apiKey || !config.authDomain || !config.projectId) {
      throw new Error('Incomplete Firebase configuration. Missing required fields: apiKey, authDomain, or projectId.');
    }

    // Initialize Firebase
    app = initializeApp(config);
    auth = getAuth(app);

    // Connect to Auth emulator in development if specified
    if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST) {
      try {
        connectAuthEmulator(auth, `http://${import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST}`);
        console.log('🔗 Connected to Firebase Auth emulator');
      } catch (emulatorError) {
        console.warn('⚠️  Failed to connect to Auth emulator:', emulatorError);
      }
    }

    isInitialized = true;
    console.log('✅ Firebase initialized successfully');
    
    return { app, auth };
    
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
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
