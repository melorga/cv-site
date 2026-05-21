import type { LayoutServerLoad } from './$types';
import { verifySessionCookie, issueSessionCookie } from '$lib/server/session';

const SESSION_TTL_SECONDS = 60 * 60;

function isE2EMode(platformEnv: { E2E_MODE?: string } | undefined): boolean {
	const proc = typeof process !== 'undefined' ? process.env.E2E_MODE : undefined;
	return proc === 'true' || platformEnv?.E2E_MODE === 'true';
}

export const load: LayoutServerLoad = async ({ cookies, locals, platform }) => {
	// E2E bypass — opt-in via the `e2e_auth` cookie ('1' = authenticated, '0' = anonymous).
	// Only active when E2E_MODE=true in the runtime env. NEVER set in production.
	if (isE2EMode(platform?.env)) {
		const e2eAuth = cookies.get('e2e_auth');
		if (e2eAuth === '1') {
			locals.user = {
				uid: 'e2e-user',
				email: 'e2e@test.local',
				displayName: 'E2E User',
				photoURL: null
			};
			return { user: locals.user };
		}
		if (e2eAuth === '0') {
			locals.user = null;
			return { user: null };
		}
	}

	const sessionCookie = cookies.get('firebase_session');
	const secret = platform?.env?.SESSION_SECRET ?? '';

	if (!sessionCookie || !secret) {
		locals.user = null;
		return { user: null };
	}

	const payload = await verifySessionCookie(sessionCookie, secret);
	if (!payload) {
		cookies.set('firebase_session', '', { path: '/', maxAge: 0 });
		locals.user = null;
		return { user: null };
	}

	locals.user = {
		uid: payload.uid,
		email: payload.email,
		displayName: null,
		photoURL: null
	};

	// Sliding refresh — re-issue 1h cookie on every authenticated request.
	const fresh = await issueSessionCookie(
		{ uid: payload.uid, email: payload.email },
		secret,
		SESSION_TTL_SECONDS
	);
	cookies.set('firebase_session', fresh, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'strict',
		maxAge: SESSION_TTL_SECONDS
	});

	return { user: locals.user };
};
