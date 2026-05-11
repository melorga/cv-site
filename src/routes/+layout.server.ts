import type { LayoutServerLoad } from './$types';
import { verifySessionCookie, issueSessionCookie } from '$lib/server/session';

const SESSION_TTL_SECONDS = 60 * 60;

export const load: LayoutServerLoad = async ({ cookies, locals, platform }) => {
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
