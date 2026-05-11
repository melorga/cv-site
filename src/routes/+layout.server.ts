import type { LayoutServerLoad } from './$types';

/**
 * STUB FOR LAYER 3. Real verification (HMAC signature, expiry, Firebase ID-token
 * check) lands in Layer 4 via src/lib/server/session.ts. For now, the presence
 * of a non-empty firebase_session cookie counts as authenticated.
 */
export const load: LayoutServerLoad = async ({ cookies, locals }) => {
	const sessionCookie = cookies.get('firebase_session');
	if (sessionCookie && sessionCookie.length > 0) {
		locals.user = {
			uid: 'pending-layer-4',
			email: 'pending@layer-4.local',
			displayName: null,
			photoURL: null
		};
	} else {
		locals.user = null;
	}
	return { user: locals.user };
};
