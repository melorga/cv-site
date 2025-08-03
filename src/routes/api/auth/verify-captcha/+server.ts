import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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

		// Generate a verification session token
		const verificationToken = crypto.randomUUID();
		const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

		// Store verification in secure cookie (accessible to JavaScript for client-side verification)
		cookies.set('captcha_verified', verificationToken, {
			path: '/',
			httpOnly: false, // Allow JavaScript access for client-side verification
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 30 * 60 // 30 minutes
		});

		// Also store expiration time (as timestamp for easier comparison)
		cookies.set('captcha_expires', expiresAt.getTime().toString(), {
			path: '/',
			httpOnly: false, // Allow JavaScript access for client-side verification
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 30 * 60 // 30 minutes
		});

		console.log(`[CAPTCHA] ✅ Verification successful for IP ${clientIP}`);

		return json({
			valid: true,
			verificationToken,
			expiresAt: expiresAt.toISOString(),
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
