import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function toBase64Url(data: ArrayBuffer | string): string {
	let bytes: Uint8Array;
	if (typeof data === 'string') {
		bytes = new TextEncoder().encode(data);
	} else {
		bytes = new Uint8Array(data);
	}
	// Standard base64
	const bin = Array.from(bytes)
		.map((b) => String.fromCharCode(b))
		.join('');
	const b64 = typeof btoa !== 'undefined' ? btoa(bin) : Buffer.from(bytes).toString('base64');
	return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmacSha256Base64Url(keyStr: string, messageB64Url: string): Promise<string> {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(keyStr),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(messageB64Url));
	return toBase64Url(sig);
}

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	try {
		console.log('[CAPTCHA] Verification request received');

		// Check if Turnstile is configured
		if (!platform?.env?.TURNSTILE_SECRET) {
			console.error('[CAPTCHA] TURNSTILE_SECRET not configured');
			return json({ error: 'CAPTCHA service not configured' }, { status: 500 });
		}

		// Parse request body
		const body = await request.json();
		const { token } = body;

		if (!token || typeof token !== 'string') {
			console.log('[CAPTCHA] Missing or invalid token');
			return json({ error: 'Invalid CAPTCHA token' }, { status: 400 });
		}

		// Get client IP for logging and verification
		const clientIP =
			request.headers.get('CF-Connecting-IP') ||
			request.headers.get('x-forwarded-for') ||
			request.headers.get('x-real-ip') ||
			'unknown';

		console.log(`[CAPTCHA] Verifying token from IP: ${clientIP}`);
		console.log('[CAPTCHA] Token received for verification');

		// Verify with Cloudflare Turnstile
		const formData = new FormData();
		formData.append('secret', platform.env.TURNSTILE_SECRET);
		formData.append('response', token);
		formData.append('remoteip', clientIP);

		const turnstileResponse = await fetch(
			'https://challenges.cloudflare.com/turnstile/v0/siteverify',
			{
				method: 'POST',
				body: formData,
				headers: {
					'User-Agent': 'cv-site-auth/1.0'
				}
			}
		);

		if (!turnstileResponse.ok) {
			console.error(`[CAPTCHA] Turnstile API error: ${turnstileResponse.status}`);
			return json({ error: 'CAPTCHA verification service error' }, { status: 502 });
		}

		const result = await turnstileResponse.json();
		console.log('[CAPTCHA] Turnstile response:', {
			success: result.success,
			challenge_ts: result.challenge_ts,
			hostname: result.hostname,
			action: result.action,
			cdata: result.cdata,
			'error-codes': result['error-codes']
		});

		if (!result.success) {
			console.log(`[CAPTCHA] Verification failed for IP ${clientIP}:`, result['error-codes']);
			return json(
				{
					error: 'CAPTCHA verification failed',
					valid: false,
					details: process.env.NODE_ENV === 'development' ? result['error-codes'] : undefined
				},
				{ status: 403 }
			);
		}

		// Generate a signed verification session token (httpOnly)
		const exp = Date.now() + 30 * 60 * 1000; // 30 minutes
		const payloadObj = { exp, rnd: crypto.randomUUID(), v: 1 };
		const payloadJson = JSON.stringify(payloadObj);
		const payloadB64 = toBase64Url(payloadJson);
		const sigB64 = await hmacSha256Base64Url(platform.env.TURNSTILE_SECRET, payloadB64);
		const captchaSessionToken = `${payloadB64}.${sigB64}`;

		cookies.set('captcha_session', captchaSessionToken, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 30 * 60
		});

		console.log(`[CAPTCHA] ✅ Verification successful for IP ${clientIP}`);

		return json({
			valid: true,
			message: 'CAPTCHA verified successfully'
		});
	} catch (error) {
		console.error('[CAPTCHA] Verification error:', error);
		return json(
			{
				error: 'CAPTCHA verification failed',
				valid: false
			},
			{ status: 500 }
		);
	}
};
