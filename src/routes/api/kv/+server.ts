import { json } from '@sveltejs/kit';

export async function POST({ request, platform }: { request: Request; platform: any }) {
	const { key, value } = await request.json();
	if (!platform?.env?.PROFILE_VECTORS) {
		return json({ error: 'KV binding unavailable' }, { status: 500 });
	}
	await platform.env.PROFILE_VECTORS.put(key, JSON.stringify(value));
	return json({ success: true });
}
