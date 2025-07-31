// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				GROQ_API_KEY: string;
				TURNSTILE_SECRET: string;
				PROFILE_VECTORS: KVNamespace;
			};
		}
	}
}

export {};
