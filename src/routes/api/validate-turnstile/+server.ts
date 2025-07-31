import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		if (!platform?.env?.TURNSTILE_SECRET) {
			return json({ error: 'Turnstile not configured' }, { status: 500 });
		}

		const body = await request.json();
		const { token } = body;

		if (!token || typeof token !== 'string') {
			return json({ error: 'Invalid token' }, { status: 400 });
		}

		const ip =
			request.headers.get('CF-Connecting-IP') ||
			request.headers.get('x-forwarded-for') ||
			request.headers.get('x-real-ip') ||
			'';

		const formData = new FormData();
		formData.append('secret', platform.env.TURNSTILE_SECRET);
		formData.append('response', token);
		formData.append('remoteip', ip);

		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			body: formData,
			headers: {
				'User-Agent': 'cv-site/1.0'
			}
		});

		if (!res.ok) {
			throw new Error(`Turnstile API returned ${res.status}`);
		}

		const outcome = await res.json();

		if (outcome.success) {
			return json({ valid: true });
		} else {
			console.warn('Turnstile validation failed:', outcome['error-codes']);
			return json(
				{
					valid: false,
					error: 'CAPTCHA validation failed'
				},
				{ status: 403 }
			);
		}
	} catch (error) {
		console.error('Turnstile validation error:', error);
		return json(
			{
				error: 'CAPTCHA verification failed',
				valid: false
			},
			{ status: 500 }
		);
	}
};
