/**
 * Writes sign-in events to Cloudflare KV. Raw IPs are never stored —
 * they are hashed with HMAC-SHA256 using the VISITOR_LOG_SALT secret.
 */

interface VisitorEvent {
	ip: string;
	email: string | null;
	userAgent: string | null;
}

function b64UrlEncode(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hashIp(ip: string, salt: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(salt),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
	return b64UrlEncode(new Uint8Array(sig));
}

export async function logVisitor(
	kv: KVNamespace,
	event: VisitorEvent,
	salt: string
): Promise<void> {
	const hashedIp = await hashIp(event.ip, salt);
	const ts = Date.now();
	const key = `visitor:${ts}:${hashedIp.slice(0, 8)}`;
	const value = JSON.stringify({
		hashedIp,
		email: event.email,
		userAgent: event.userAgent,
		timestamp: ts
	});
	await kv.put(key, value, { expirationTtl: 60 * 60 * 24 * 365 });
}
