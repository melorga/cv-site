// src/lib/firebase.ts
import { browser } from '$app/environment';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
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
			// Always require proper Firebase configuration
			throw new Error(
				'Firebase configuration not found. Please set VITE_FIREBASE_CONFIG environment variable.'
			);
		}

		// Validate required config fields
		if (!config.apiKey || !config.authDomain || !config.projectId) {
			throw new Error(
				'Incomplete Firebase configuration. Missing required fields: apiKey, authDomain, or projectId.'
			);
		}

		// Initialize Firebase
		app = initializeApp(config);
		auth = getAuth(app);


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
