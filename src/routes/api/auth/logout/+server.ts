import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies, url }) => {
	// Clear both session cookies
	cookies.set('firebase_session', '', {
		path: '/',
		maxAge: 0,
		httpOnly: true,
		secure: true,
		sameSite: 'strict'
	});
	cookies.set('captcha_session', '', {
		path: '/',
		maxAge: 0,
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:'
	});

	return new Response(null, { status: 204 });
};
