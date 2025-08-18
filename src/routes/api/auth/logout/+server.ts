import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies, url }) => {
	// Clear the httpOnly captcha session cookie
	cookies.set('captcha_session', '', {
		path: '/',
		maxAge: 0,
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:'
	});

	return new Response(null, { status: 204 });
};
