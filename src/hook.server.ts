// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const limiter = new RateLimiterMemory({ points: 60, duration: 60 }); // 60 req/min

export const handle: Handle = async ({ event, resolve }) => {
	// Rate limiting
	try {
		await limiter.consume(
			event.request.headers.get('cf-connecting-ip') || event.getClientAddress() || 'anon',
			1
		);
	} catch {
		return new Response('Rate limited', { status: 429 });
	}

	// Resolve the request
	const response = await resolve(event);

	// Add security headers
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-XSS-Protection', '1; mode=block');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	// CSP for production
	if (import.meta.env.PROD) {
		response.headers.set(
			'Content-Security-Policy',
			"default-src 'self'; " +
				"script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; " +
				"style-src 'self' 'unsafe-inline'; " +
				"img-src 'self' data: https:; " +
				"font-src 'self' data:; " +
				"connect-src 'self' https://api.groq.com https://challenges.cloudflare.com; " +
				'frame-src https://challenges.cloudflare.com; ' +
				"object-src 'none'; " +
				"base-uri 'self';"
		);
	}

	return response;
};
