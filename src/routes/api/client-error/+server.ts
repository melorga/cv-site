import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MAX_BODY = 4096;

export const POST: RequestHandler = async ({ request, locals }) => {
	const raw = await request.text();
	if (raw.length > MAX_BODY) return json({ error: 'too-large' }, { status: 413 });
	let body: { message?: string; stackHash?: string; path?: string };
	try {
		body = JSON.parse(raw);
	} catch {
		return json({ error: 'invalid-json' }, { status: 400 });
	}
	console.warn('[client-error]', {
		uidHint: locals.user?.uid?.slice(0, 6) ?? 'anon',
		path: typeof body.path === 'string' ? body.path.slice(0, 200) : '',
		message: typeof body.message === 'string' ? body.message.slice(0, 200) : '',
		stackHash: typeof body.stackHash === 'string' ? body.stackHash.slice(0, 64) : ''
	});
	return json({ ok: true });
};
