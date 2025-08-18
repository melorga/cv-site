import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// CSP reports can be JSON or application/csp-report
		const contentType = request.headers.get('content-type') || '';
		let body: unknown;
		if (
			contentType.includes('application/json') ||
			contentType.includes('application/csp-report')
		) {
			body = await request.json().catch(() => null);
		} else {
			body = await request.text().catch(() => null);
		}

		// Log minimally to avoid PII retention; in production, route to a logging service
		console.warn(
			'[CSP-REPORT]',
			JSON.stringify({
				receivedAt: new Date().toISOString(),
				contentType,
				body
			}).slice(0, 5000)
		);

		return new Response(null, { status: 204 });
	} catch {
		return new Response(null, { status: 204 });
	}
};
