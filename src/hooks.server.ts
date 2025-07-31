// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { randomBytes } from 'node:crypto';

// More aggressive rate limiting for better testing
const limiter = new RateLimiterMemory({ points: 30, duration: 60 }); // 30 req/min

// Generate a cryptographically secure nonce
function generateNonce(): string {
	return randomBytes(16).toString('base64');
}

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
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), web-share=()');

	// CSP - Secure configuration that maintains functionality
	const csp = [
		"default-src 'self'",
		// Scripts: Restrict to trusted sources only - use nonce for inline scripts
		`script-src 'self' https://challenges.cloudflare.com 'wasm-unsafe-eval' 'nonce-${nonce}'`,
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
