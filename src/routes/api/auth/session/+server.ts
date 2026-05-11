import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { issueSessionCookie } from '$lib/server/session';
import { logVisitor } from '$lib/server/visitor-log';
import { authAttemptFailed, clearAuthLockout, isAuthLockedOut } from '$lib/server/rate-limit';

const SESSION_TTL_SECONDS = 60 * 60;

interface TokenInfo {
	user_id?: string;
	sub?: string;
	email?: string;
	exp?: number | string;
}

async function verifyFirebaseIdToken(idToken: string): Promise<{
	uid: string;
	email: string | null;
} | null> {
	const res = await fetch(
		`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${encodeURIComponent(idToken)}`
	);
	if (!res.ok) return null;
	const info = (await res.json()) as TokenInfo;
	const uid = info.user_id ?? info.sub;
	if (typeof uid !== 'string' || uid.length === 0) return null;
	const exp =
		typeof info.exp === 'string' ? parseInt(info.exp, 10) : (info.exp as number | undefined);
	if (!Number.isFinite(exp) || (exp as number) * 1000 < Date.now()) return null;
	return { uid, email: typeof info.email === 'string' ? info.email : null };
}

export const POST: RequestHandler = async ({ request, cookies, platform, getClientAddress }) => {
	const ip = request.headers.get('cf-connecting-ip') ?? getClientAddress() ?? 'unknown';
	const kv = platform?.env?.VISITOR_LOG;
	const sessionSecret = platform?.env?.SESSION_SECRET ?? '';
	const salt = platform?.env?.VISITOR_LOG_SALT ?? '';

	if (!sessionSecret || sessionSecret.length < 32) {
		return json({ error: 'server-misconfigured' }, { status: 500 });
	}

	if (kv && (await isAuthLockedOut(kv, ip))) {
		return json(
			{ error: 'locked-out', message: 'Too many attempts. Try again in 15 minutes.' },
			{ status: 429 }
		);
	}

	let body: { idToken?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid-json' }, { status: 400 });
	}
	if (!body.idToken || typeof body.idToken !== 'string') {
		return json({ error: 'missing-id-token' }, { status: 400 });
	}

	const info = await verifyFirebaseIdToken(body.idToken);
	if (!info) {
		if (kv) await authAttemptFailed(kv, ip);
		return json({ error: 'invalid-id-token' }, { status: 401 });
	}

	const cookie = await issueSessionCookie(
		{ uid: info.uid, email: info.email },
		sessionSecret,
		SESSION_TTL_SECONDS
	);
	cookies.set('firebase_session', cookie, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'strict',
		maxAge: SESSION_TTL_SECONDS
	});

	if (kv) {
		await clearAuthLockout(kv, ip);
		if (salt) {
			try {
				await logVisitor(
					kv,
					{ ip, email: info.email, userAgent: request.headers.get('user-agent') },
					salt
				);
			} catch (e) {
				console.warn('[visitor-log] write failed:', e);
			}
		}
	}

	return json({ ok: true });
};
