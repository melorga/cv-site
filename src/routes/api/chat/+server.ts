import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Groq from 'groq-sdk';

// Utility function for vector similarity (reserved for future use)
// function cosineSimilarity(a: number[], b: number[]): number {
//   const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
//   const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
//   const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
//   return dot / (normA * normB);
// }

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		console.log('Chat API called');

		// Parse request with size limits
		const requestBody = await request.text();
		if (requestBody.length > 10000) {
			// 10KB limit
			return json({ error: 'Request body too large' }, { status: 413 });
		}

		let parsedBody;
		try {
			parsedBody = JSON.parse(requestBody);
		} catch {
			return json({ error: 'Invalid JSON format' }, { status: 400 });
		}

		const { message } = parsedBody;

		// Get client IP for logging
		const clientIP =
			request.headers.get('CF-Connecting-IP') ||
			request.headers.get('x-forwarded-for') ||
			request.headers.get('x-real-ip') ||
			'unknown';

		console.log(`[SECURITY] Chat request from IP: ${clientIP}`);
		console.log('[SECURITY] User-Agent received');
		console.log(`[SECURITY] Request timestamp: ${new Date().toISOString()}`);

		// Validate message
		if (!message || typeof message !== 'string') {
			console.log(`[SECURITY] Invalid message format from IP: ${clientIP}`);
			return json({ error: 'Message is required and must be a string' }, { status: 400 });
		}

		if (message.length > 1000) {
			console.log(`[SECURITY] Message too long (${message.length} chars) from IP: ${clientIP}`);
			return json({ error: 'Message too long (max 1000 characters)' }, { status: 400 });
		}

		// Basic content filtering
		const suspiciousPatterns = [
			/\b(exec|eval|system|shell|cmd)\s*\(/i,
			/<script[^>]*>.*<\/script>/i,
			/javascript:/i,
			/(union|select|insert|update|delete|drop)\s+/i
		];

		if (suspiciousPatterns.some((pattern) => pattern.test(message))) {
			console.log(
				`[SECURITY] Suspicious content detected from IP: ${clientIP} - Message: ${message.substring(0, 100)}...`
			);
			return json({ error: 'Invalid message content' }, { status: 400 });
		}

		console.log(`[SECURITY] Message validation passed for IP: ${clientIP}`);

		// CAPTCHA verification is enforced by middleware using the httpOnly captcha_session cookie.
		// No need to accept or validate any client-provided CAPTCHA tokens here.
		console.log('[CAPTCHA] Enforcement handled by middleware via captcha_session cookie');

		// Validate environment variables
		if (!platform?.env?.GROQ_API_KEY) {
			console.error('GROQ_API_KEY not found in environment');
			return json({ error: 'GROQ API key not configured' }, { status: 500 });
		}

		if (!platform?.env?.PROFILE_VECTORS) {
			console.error('PROFILE_VECTORS KV binding not found');
			return json({ error: 'Profile vectors not available' }, { status: 500 });
		}

		console.log('Environment check passed');

		// Initialize Groq client
		const groq = new Groq({
			apiKey: platform.env.GROQ_API_KEY
		});

		console.log('Groq client initialized');

		// Aggregate embeddings across all KV keys using pagination and fair sampling
		const kv = platform.env.PROFILE_VECTORS;
		let cursor: string | undefined = undefined;
		let totalKeysFetched = 0;
		const maxKeysToFetch = 1000; // safety cap
		const allKeys: { name: string }[] = [];

		while (true) {
			const page = (await kv.list({ cursor })) as {
				keys: { name: string }[];
				cursor?: string;
				list_complete?: boolean;
			};
			allKeys.push(...page.keys);
			totalKeysFetched += page.keys.length;
			cursor = page.cursor;
			if (page.list_complete || !cursor || totalKeysFetched >= maxKeysToFetch) break;
		}

		console.log('Total KV keys discovered:', allKeys.length);

		// Group keys by logical document (best-effort):
		// - New scheme: docs/{fileBase}/{runId}/chunk-{i}
		// - Legacy scheme: {file}-chunk-{i}
		const groups = new Map<string, string[]>();
		for (const k of allKeys) {
			const name = k.name;
			let groupId: string;
			if (name.startsWith('docs/')) {
				const parts = name.split('/');
				groupId = parts.length >= 3 ? `${parts[0]}/${parts[1]}` : 'unknown'; // docs/fileBase
			} else {
				// legacy single-level key names, derive group from prefix before '-chunk-'
				const m = name.match(/^(.*?)-chunk-\d+$/);
				groupId = m ? m[1] : 'unknown';
			}
			if (!groups.has(groupId)) groups.set(groupId, []);
			groups.get(groupId)!.push(name);
		}

		// Fair sampling: cap total chunks but sample up to N per group
		const maxTotalChunks = 50;
		const maxPerGroup = 12;
		const selectedKeys: string[] = [];
		for (const [, names] of groups) {
			// simple deterministic order
			names.sort();
			for (const n of names.slice(0, maxPerGroup)) {
				if (selectedKeys.length >= maxTotalChunks) break;
				selectedKeys.push(n);
			}
			if (selectedKeys.length >= maxTotalChunks) break;
		}

		// If grouping failed or too few, fallback to global selection
		if (selectedKeys.length === 0) {
			selectedKeys.push(
				...allKeys.map((k) => k.name).slice(0, Math.min(allKeys.length, maxTotalChunks))
			);
		}

		const contextChunks: string[] = [];
		for (const keyName of selectedKeys) {
			try {
				const stored = await kv.get(keyName);
				if (!stored) continue;
				const data = JSON.parse(stored);
				if (data?.content && typeof data.content === 'string') {
					contextChunks.push(data.content);
				}
			} catch {
				console.warn('Failed to parse stored data for key:', keyName);
			}
		}

		console.log('Retrieved context chunks:', contextChunks.length);

		// Build context from retrieved chunks
		const context = contextChunks.join('\n\n');

		const systemPrompt = `You are an AI assistant representing Mariano Elorga, an AWS Solutions Architect. 
Use the following information about his professional background to answer questions accurately and professionally.

PROFESSIONAL INFORMATION:
${context}

Respond as if you are representing Mariano's professional profile to potential employers or recruiters. Be helpful, accurate, and professional. If asked about something not covered in the provided information, acknowledge that politely and offer to clarify what information is available. It is important to concise, sometimes less is more, so avoid big chunks of text.`;

		console.log('Sending request to Groq API');

		// Call Groq API
		const completion = await groq.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: systemPrompt
				},
				{
					role: 'user',
					content: message
				}
			],
			model: 'llama3-8b-8192',
			temperature: 0.7,
			max_tokens: 1000
		});

		console.log('Groq API response received');

		const response =
			completion.choices[0]?.message?.content ||
			"I apologize, but I couldn't generate a response at this time.";

		return json({
			response: response,
			contextUsed: contextChunks.length > 0
		});
	} catch (error) {
		console.error('Chat API error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const errorStack = error instanceof Error ? error.stack : undefined;

		return json(
			{
				error: 'Internal server error',
				details: import.meta.env.DEV ? errorMessage : 'Server error',
				...(import.meta.env.DEV && { stack: errorStack })
			},
			{ status: 500 }
		);
	}
};
