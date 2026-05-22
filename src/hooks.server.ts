// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { verifySessionCookie } from '$lib/server/session';

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

// Generate a cryptographically secure nonce
function generateNonce(): string {
	const arr = new Uint8Array(16);
	crypto.getRandomValues(arr);
	return toBase64Url(arr);
}

// Routes that require an authenticated session. The Firebase Auth flow mints
// a signed `firebase_session` cookie via /api/auth/session (Layer 4) — the
// middleware below verifies it before allowing the request through.
const PROTECTED_ROUTES = [
	'/api/chat'
	// Add other authenticated routes here
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

	// Session-auth middleware for protected routes. We verify the signed
	// firebase_session cookie issued by /api/auth/session (Layer 4) rather
	// than the legacy captcha_session (the AuthGate no longer uses Turnstile).
	const isProtectedRoute = PROTECTED_ROUTES.some((route) => event.url.pathname.startsWith(route));
	if (isProtectedRoute) {
		const sessionCookie = event.cookies.get('firebase_session');
		const sessionSecret = event.platform?.env?.SESSION_SECRET ?? '';
		const valid =
			sessionCookie && sessionSecret
				? !!(await verifySessionCookie(sessionCookie, sessionSecret))
				: false;
		if (!valid) {
			return new Response(
				JSON.stringify({
					error: 'authentication-required',
					message: 'Please sign in to use this resource.'
				}),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		}
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
