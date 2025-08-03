// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { randomBytes } from 'node:crypto';
// Unused import: import { json } from '@sveltejs/kit';

// More aggressive rate limiting for better testing
const limiter = new RateLimiterMemory({ points: 30, duration: 60 }); // 30 req/min

// Generate a cryptographically secure nonce
function generateNonce(): string {
	return randomBytes(16).toString('base64');
}

// Check if CAPTCHA verification is valid
function isCaptchaValid(cookies: {
	get: (name: string) => string | undefined;
	getAll?: () => Array<{ name: string; value: string }>;
}): boolean {
	console.log('[CAPTCHA-MIDDLEWARE] 🔍 Starting cookie verification check');

	// Get all cookies for debugging (reserved for future use)
	try {
		// Try to access cookies.getAll() or iterate through available cookies
		if (typeof cookies.getAll === 'function') {
			console.log('[CAPTCHA-MIDDLEWARE] 📋 Cookies received');
		} else {
			console.log('[CAPTCHA-MIDDLEWARE] 📋 Cookies object type:', typeof cookies);
		}
	} catch (e) {
		console.log(
			'[CAPTCHA-MIDDLEWARE] ⚠️ Could not enumerate cookies:',
			e instanceof Error ? e.message : 'Unknown error'
		);
	}

	const verificationToken = cookies.get('captcha_verified');
	const expiresAt = cookies.get('captcha_expires');

	console.log('[CAPTCHA-MIDDLEWARE] 🔑 Cookie values:');
	console.log(
		'[CAPTCHA-MIDDLEWARE]   - captcha_verified exists:',
		verificationToken ? 'YES' : 'NO'
	);
	console.log('[CAPTCHA-MIDDLEWARE]   - captcha_expires exists:', expiresAt ? 'YES' : 'NO');

	if (!verificationToken || !expiresAt) {
		console.log('[CAPTCHA-MIDDLEWARE] ❌ Missing required cookies');
		console.log('[CAPTCHA-MIDDLEWARE]   - verificationToken exists:', !!verificationToken);
		console.log('[CAPTCHA-MIDDLEWARE]   - expiresAt exists:', !!expiresAt);
		return false;
	}

	try {
		// Parse expiration - could be timestamp or ISO string
		let expiration;
		const expiresAtStr = String(expiresAt);
		console.log('[CAPTCHA-MIDDLEWARE] 📅 Parsing expiration string:', expiresAtStr);

		// Try parsing as timestamp first
		if (/^\d+$/.test(expiresAtStr)) {
			console.log('[CAPTCHA-MIDDLEWARE] 📅 Parsing as timestamp');
			expiration = new Date(parseInt(expiresAtStr));
		} else {
			console.log('[CAPTCHA-MIDDLEWARE] 📅 Parsing as ISO string');
			expiration = new Date(expiresAtStr);
		}

		const now = new Date();
		console.log('[CAPTCHA-MIDDLEWARE] ⏰ Time comparison:');
		console.log('[CAPTCHA-MIDDLEWARE]   - Current time:', now.toISOString(), `(${now.getTime()})`);
		console.log(
			'[CAPTCHA-MIDDLEWARE]   - Expiration time:',
			expiration.toISOString(),
			`(${expiration.getTime()})`
		);
		console.log('[CAPTCHA-MIDDLEWARE]   - Is expired?:', now > expiration);
		console.log(
			'[CAPTCHA-MIDDLEWARE]   - Time until expiry (ms):',
			expiration.getTime() - now.getTime()
		);

		if (now > expiration) {
			console.log('[CAPTCHA-MIDDLEWARE] ⏰ Verification expired');
			return false;
		}

		console.log('[CAPTCHA-MIDDLEWARE] ✅ Cookie verification successful');
		return true;
	} catch (error) {
		console.error('[CAPTCHA-MIDDLEWARE] ❌ Error checking verification:', error);
		console.error(
			'[CAPTCHA-MIDDLEWARE] ❌ Error stack:',
			error instanceof Error ? error.stack : 'Unknown stack'
		);
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

	// Rate limiting
	try {
		await limiter.consume(
			event.request.headers.get('cf-connecting-ip') || event.getClientAddress() || 'anon',
			1
		);
	} catch {
		return new Response('Rate limited', { status: 429 });
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
	console.log(`[MIDDLEWARE]   - Is POST: ${event.request.method === 'POST'}`);
	console.log(
		`[MIDDLEWARE]   - Will check CAPTCHA: ${isProtectedRoute && event.request.method === 'POST'}`
	);

	if (isProtectedRoute && event.request.method === 'POST') {
		console.log(`[MIDDLEWARE] 🔒 CAPTCHA verification required for ${event.url.pathname}`);

		if (!isCaptchaValid(event.cookies)) {
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
			`[MIDDLEWARE] ⚪ No CAPTCHA check needed for ${event.url.pathname} (not protected or not POST)`
		);
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
	response.headers.set('X-XSS-Protection', '1; mode=block');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	// Updated Permissions-Policy for July 2025 standards - focus on current features only
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
	);

	// HSTS - Force HTTPS connections for enhanced security
	// Only apply in production to avoid local development issues
	if (event.url.hostname !== 'localhost' && event.url.protocol === 'https:') {
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=31536000; includeSubDomains; preload'
		);
	}

	// CSP - Secure configuration that maintains functionality
	const csp = [
		"default-src 'self'",
		// Scripts: Restrict to trusted sources only - use nonce for inline scripts
		// Note: 'unsafe-eval' is required for Cloudflare Turnstile to function properly
		`script-src 'self' https://challenges.cloudflare.com 'wasm-unsafe-eval' 'unsafe-eval' 'nonce-${nonce}'`,
		// Styles: Allow self and inline (needed for Tailwind/component styles)
		"style-src 'self' 'unsafe-inline'",
		// Images: Allow HTTPS, data URLs, and self
		"img-src 'self' data: https:",
		// Fonts: Allow self and data URLs
		"font-src 'self' data:",
		// Connections: Restrict to necessary APIs only
		"connect-src 'self' https://api.groq.com https://challenges.cloudflare.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
		// Frames: Only Turnstile
		'frame-src https://challenges.cloudflare.com',
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

	return response;
};
