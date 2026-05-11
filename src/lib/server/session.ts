/**
 * Signed session cookie utilities.
 *
 * Format: base64url(payload).base64url(HMAC-SHA256(payload, secret))
 * Payload: { uid: string, email: string | null, exp: number (unix-ms), iat: number }
 *
 * The HMAC secret is stored in the platform env as SESSION_SECRET.
 * Issued by issueSessionCookie() after Firebase ID-token verification.
 * Read on every request by verifySessionCookie().
 */

export interface SessionPayload {
	uid: string;
	email: string | null;
}

interface FullPayload extends SessionPayload {
	exp: number;
	iat: number;
}

function b64UrlEncode(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlEncodeStr(s: string): string {
	return b64UrlEncode(new TextEncoder().encode(s));
}

function b64UrlDecodeStr(s: string): string {
	const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((s.length + 2) % 4);
	const bin = atob(padded);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return new TextDecoder().decode(bytes);
}

async function hmac(secret: string, message: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
	return b64UrlEncode(new Uint8Array(sig));
}

function constantTimeEq(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let r = 0;
	for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return r === 0;
}

export async function issueSessionCookie(
	payload: SessionPayload,
	secret: string,
	ttlSeconds: number
): Promise<string> {
	const now = Date.now();
	const full: FullPayload = {
		uid: payload.uid,
		email: payload.email,
		iat: now,
		exp: now + ttlSeconds * 1000
	};
	const payloadStr = b64UrlEncodeStr(JSON.stringify(full));
	const sig = await hmac(secret, payloadStr);
	return `${payloadStr}.${sig}`;
}

export async function verifySessionCookie(
	cookie: string,
	secret: string
): Promise<SessionPayload | null> {
	if (!cookie || typeof cookie !== 'string') return null;
	const parts = cookie.split('.');
	if (parts.length !== 2) return null;
	const [payloadStr, sig] = parts;
	if (!payloadStr || !sig) return null;
	const expectedSig = await hmac(secret, payloadStr);
	if (!constantTimeEq(sig, expectedSig)) return null;
	try {
		const full = JSON.parse(b64UrlDecodeStr(payloadStr)) as FullPayload;
		if (typeof full.exp !== 'number' || full.exp <= Date.now()) return null;
		if (typeof full.uid !== 'string' || full.uid.length === 0) return null;
		return { uid: full.uid, email: full.email };
	} catch {
		return null;
	}
}
