// See https://svelte.dev/docs/kit/types#app.d.ts
import type { User } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			nonce: string;
			user: User | null;
		}
		interface PageData {
			user: User | null;
		}
		interface Platform {
			env: {
				GROQ_API_KEY: string;
				GROQ_MODEL?: string;
				TURNSTILE_SECRET: string;
				PROFILE_VECTORS: KVNamespace;
				VISITOR_LOG?: KVNamespace;
				VISITOR_LOG_SALT?: string;
				SESSION_SECRET?: string;
				VITE_FIREBASE_CONFIG?: string;
				VITE_PROFILE_NAME?: string;
				VITE_PROFILE_ROLE?: string;
				ALLOW_EVAL?: string;
				E2E_MODE?: string;
			};
		}
	}
}

export {};
