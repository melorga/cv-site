import { json } from '@sveltejs/kit';

export async function POST({ request, platform }: { request: Request; platform: any }) {
	if (!platform?.env?.PROFILE_VECTORS) {
		return json({ error: 'KV binding not available' }, { status: 500 });
	}

	const { key } = await request.json();
	const value = await platform.env.PROFILE_VECTORS.get(key);
	if (value) {
		return json({ value: JSON.parse(value) });
	} else {
		return json({ error: 'Key not found' }, { status: 404 });
	}
}
