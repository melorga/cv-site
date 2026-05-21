// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// More aggressive rate limiting for better testing
const limiter = new RateLimiterMemory({ points: 30, duration: 60 }); // 30 req/min

// Helpers using Web Crypto API for Workers compatibility
function toBase64Url(bytes: Uint8Array): string {
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
	return toBase64Url(new Uint8Array(sig));
}

// Generate a cryptographically secure nonce
function generateNonce(): string {
	const arr = new Uint8Array(16);
	crypto.getRandomValues(arr);
	return toBase64Url(arr);
}

// Check if CAPTCHA verification is valid
async function isCaptchaValid(
	cookies: { get: (name: string) => string | undefined },
	secret: string
): Promise<boolean> {
	try {
		const token = cookies.get('captcha_session');
		if (!token) return false;

		// token format: base64url(payload).base64url(signature)
		const parts = token.split('.');
		if (parts.length !== 2) return false;
		const [payloadB64, sigB64] = parts;

		const payloadBytes =
			typeof Buffer !== 'undefined'
				? Buffer.from(payloadB64, 'base64url')
				: Uint8Array.from(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
						c.charCodeAt(0)
					);
		const payloadJson = new TextDecoder().decode(payloadBytes);
		const expectedSig = await hmacSha256Base64Url(secret, payloadB64);
		if (sigB64 !== expectedSig) return false;

		const payload = JSON.parse(payloadJson) as { exp: number; rnd: string; v: number };
		if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return false;
		return true;
	} catch {
		return false;
	}
}

// Protected routes that require CAPTCHA verification
const PROTECTED_ROUTES = [
	'/api/chat'
	// Add other routes that need CAPTCHA protection
];

export const handle: Handle = async ({ event, resolve }) => {
	// Generate nonce for this request
	const nonce = generateNonce();

	// Make nonce available to the app
	event.locals.nonce = nonce;

	// Rate limiting (per-session in-memory)
	try {
		await limiter.consume(
			event.request.headers.get('cf-connecting-ip') || event.getClientAddress() || 'anon',
			1
		);
	} catch {
		return new Response('Rate limited', { status: 429 });
	}

	// Per-IP daily cap for /api/chat
	if (event.url.pathname.startsWith('/api/chat')) {
		const kv = event.platform?.env?.VISITOR_LOG;
		if (kv) {
			const { perIpDailyChatCap } = await import('$lib/server/rate-limit');
			const ipKey =
				event.request.headers.get('cf-connecting-ip') || event.getClientAddress() || 'anon';
			const allowed = await perIpDailyChatCap(kv, ipKey);
			if (!allowed) {
				return new Response(
					JSON.stringify({
						error: 'daily-cap-reached',
						message: 'Daily request limit reached. Try again tomorrow.'
					}),
					{ status: 429, headers: { 'Content-Type': 'application/json' } }
				);
			}
		}
	}

	// CAPTCHA verification middleware for protected routes
	const clientIP =
		event.request.headers.get('cf-connecting-ip') || event.getClientAddress() || 'unknown';
	console.log(
		`[MIDDLEWARE] 🌐 Processing request: ${event.request.method} ${event.url.pathname} from IP: ${clientIP}`
	);

	const isProtectedRoute = PROTECTED_ROUTES.some((route) => event.url.pathname.startsWith(route));
	console.log(`[MIDDLEWARE] 🛡️ Route protection check:`);
	console.log(`[MIDDLEWARE]   - Path: ${event.url.pathname}`);
	console.log(`[MIDDLEWARE]   - Method: ${event.request.method}`);
	console.log(`[MIDDLEWARE]   - Protected routes: ${JSON.stringify(PROTECTED_ROUTES)}`);
	console.log(`[MIDDLEWARE]   - Is protected: ${isProtectedRoute}`);
	console.log(`[MIDDLEWARE]   - Method: ${event.request.method}`);
	console.log(`[MIDDLEWARE]   - Will check CAPTCHA: ${isProtectedRoute}`);

	// Enforce CAPTCHA for all methods on protected routes (not just POST)
	if (isProtectedRoute) {
		console.log(`[MIDDLEWARE] 🔒 CAPTCHA verification required for ${event.url.pathname}`);

		const secret = (event.platform?.env?.TURNSTILE_SECRET as string | undefined) || '';
		const valid = secret ? await isCaptchaValid(event.cookies, secret) : false;
		if (!valid) {
			console.log(
				`[CAPTCHA] 🚫 Access denied to ${event.url.pathname} from IP: ${clientIP} - No valid CAPTCHA verification`
			);
			return new Response(
				JSON.stringify({
					error: 'CAPTCHA verification required',
					code: 'CAPTCHA_REQUIRED',
					message: 'Please complete CAPTCHA verification before accessing this resource'
				}),
				{
					status: 403,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		console.log(
			`[CAPTCHA] ✅ Access granted to ${event.url.pathname} from IP: ${clientIP} - Valid CAPTCHA verification`
		);
	} else {
		console.log(
			`[MIDDLEWARE] ⚪ No CAPTCHA check needed for ${event.url.pathname} (not a protected route)`
		);
	}

	// Gentle enforcement for homepage GET '/': clear stale cookies and set no-store to avoid caching issues.
	// We do not hard-block the homepage, but we make sure stale verification does not linger.
	try {
		if (event.url.pathname === '/' && event.request.method === 'GET') {
			const hasSession = !!event.cookies.get('captcha_session');
			const secret = (event.platform?.env?.TURNSTILE_SECRET as string | undefined) || '';
			const valid = secret ? await isCaptchaValid(event.cookies, secret) : false;
			if (hasSession && !valid) {
				console.log('[MIDDLEWARE] 🧹 Clearing stale CAPTCHA cookies for homepage');
				// Clear potentially stale cookies
				event.cookies.set('captcha_session', '', {
					path: '/',
					maxAge: 0,
					httpOnly: true,
					sameSite: 'lax',
					secure: event.url.protocol === 'https:'
				});
			}
		}
	} catch (e) {
		console.log('[MIDDLEWARE] ⚠️ Error during homepage gentle enforcement:', e);
	}

	// Resolve the request with transformPageChunk to inject nonce
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => {
			// Inject nonce into inline scripts
			return html.replace(/<script([^>]*)>/g, (match, attrs) => {
				// Only add nonce to inline scripts (those without src attribute)
				if (!attrs.includes('src=')) {
					return `<script${attrs} nonce="${nonce}">`;
				}
				return match;
			});
		}
	});

	// Add security headers
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	// Remove deprecated X-XSS-Protection header
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	// Avoid caching the homepage to reduce stale Turnstile/session issues
	if (event.url.pathname === '/' && event.request.method === 'GET') {
		response.headers.set('Cache-Control', 'no-store, max-age=0');
		response.headers.set('Pragma', 'no-cache');
		response.headers.set('Expires', '0');
	}
	// Updated Permissions-Policy - limit powerful features
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
	);

	// Cross-origin isolation headers.
	// COEP is intentionally NOT set: it would block the Calendly iframe
	// (calendly.com doesn't ship CORP). COOP is kept so window.opener
	// relationships remain same-origin. CORP is kept to prevent our own
	// resources being embedded cross-origin.
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

	// Robots header to allow indexing of HTML pages
	if (response.headers.get('Content-Type')?.includes('text/html')) {
		response.headers.set('X-Robots-Tag', 'all');
	}

	// HSTS preload-ready (2 years). Only in production to avoid local dev issues.
	if (event.url.hostname !== 'localhost' && event.url.protocol === 'https:') {
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=63072000; includeSubDomains; preload'
		);
	}

	// CSP - Secure configuration that maintains functionality
	const cfEnv = event.platform?.env as Record<string, string> | undefined;
	const allowEval =
		cfEnv?.ALLOW_EVAL === 'true' ||
		(typeof process !== 'undefined' && process.env.ALLOW_EVAL === 'true');

	const scriptSrc = [
		"'self'",
		'https://challenges.cloudflare.com',
		'https://assets.calendly.com',
		"'nonce-" + nonce + "'",
		"'strict-dynamic'",
		...(allowEval ? ["'wasm-unsafe-eval'", "'unsafe-eval'"] : [])
	].join(' ');

	const csp = [
		"default-src 'self'",
		// Scripts: Restrict to trusted sources only - use nonce and strict-dynamic; optionally allow eval via env
		`script-src ${scriptSrc}`,
		// Styles: Allow self and inline (needed for Tailwind/component styles)
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://assets.calendly.com",
		// Images: Allow HTTPS, data URLs, and self
		"img-src 'self' data: https:",
		// Fonts: Allow self and data
		"font-src 'self' data: https://fonts.gstatic.com",
		// Connections: Firebase auth, Groq, Turnstile, Calendly, Google tokeninfo (server-side)
		"connect-src 'self' https://api.groq.com https://challenges.cloudflare.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://calendly.com https://www.googleapis.com",
		// Frames: Turnstile + Calendly
		'frame-src https://challenges.cloudflare.com https://calendly.com',
		// Workers: Allow self for SvelteKit service workers
		"worker-src 'self'",
		// Manifests: Allow self for PWA manifest
		"manifest-src 'self'",
		// Media: Allow self
		"media-src 'self'",
		// Objects: Block all plugins/objects
		"object-src 'none'",
		// Base URI: Only allow same origin
		"base-uri 'self'",
		// Form actions: Only allow same origin
		"form-action 'self'",
		// Frame ancestors: Block embedding (defense in depth with X-Frame-Options)
		"frame-ancestors 'none'",
		// Upgrade HTTP to HTTPS in production
		...(event.url.hostname !== 'localhost' ? ['upgrade-insecure-requests'] : [])
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);

	// Optional: add CSP report endpoints if configured
	const reportUrl = '/api/csp-report';
	response.headers.append('Content-Security-Policy', `; report-uri ${reportUrl}`);
	response.headers.set(
		'Report-To',
		JSON.stringify({
			group: 'csp-endpoint',
			max_age: 10886400,
			endpoints: [{ url: reportUrl }]
		})
	);

	return response;
};
