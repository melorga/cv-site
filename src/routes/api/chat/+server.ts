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

	const { message, turnstileToken } = parsedBody;

	// Get client IP for logging
	const clientIP = request.headers.get('CF-Connecting-IP') || 
					 request.headers.get('x-forwarded-for') || 
					 request.headers.get('x-real-ip') || 
					 'unknown';

	console.log(`[SECURITY] Chat request from IP: ${clientIP}`);
	console.log(`[SECURITY] User-Agent: ${request.headers.get('user-agent') || 'unknown'}`);
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
		console.log(`[SECURITY] Suspicious content detected from IP: ${clientIP} - Message: ${message.substring(0, 100)}...`);
		return json({ error: 'Invalid message content' }, { status: 400 });
	}

	console.log(`[SECURITY] Message validation passed for IP: ${clientIP}`);

	// Verify Turnstile token
	console.log(`[CAPTCHA-API] Checking Turnstile token...`);
	
	if (!turnstileToken || typeof turnstileToken !== 'string') {
		console.log(`[SECURITY] Missing or invalid Turnstile token from IP: ${clientIP}`);
		return json({ 
			error: 'CAPTCHA token required',
			details: 'Security verification failed - please complete the CAPTCHA'
		}, { status: 403 });
	}

	// Use cookie-verified token for previously validated sessions
	if (turnstileToken === 'cookie-verified') {
		console.log(`[CAPTCHA-API] Using cookie-verified token`);
		// Cookie verification already handled by verify-captcha endpoint
	} else {
		// Validate new Turnstile token
		console.log('[CAPTCHA-API] Validating fresh Turnstile token');
		// Validate Turnstile token
		if (platform?.env?.TURNSTILE_SECRET) {
			try {
				console.log('Validating Turnstile token');
				const formData = new FormData();
				formData.append('secret', platform.env.TURNSTILE_SECRET);
				formData.append('response', turnstileToken);
				formData.append('remoteip', request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '');

				const turnstileResponse = await fetch(
					'https://challenges.cloudflare.com/turnstile/v0/siteverify',
					{
						method: 'POST',
						body: formData
					}
				);

				const turnstileResult = await turnstileResponse.json();
				console.log('Turnstile validation result:', turnstileResult);
				
				if (!turnstileResult.success) {
					console.log('Turnstile validation failed:', turnstileResult['error-codes']);
					return json({ 
						error: 'CAPTCHA verification failed',
						details: import.meta.env.DEV ? turnstileResult['error-codes'] : undefined
					}, { status: 403 });
				}
				console.log('Turnstile validation successful');
			} catch (turnstileError) {
				console.error('Turnstile verification error:', turnstileError);
				return json({ error: 'CAPTCHA verification error' }, { status: 500 });
			}
		} else {
			console.warn('TURNSTILE_SECRET not configured, skipping validation');
		}
	}

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

		// For now, let's try a simple approach first - get all stored vectors
		// In production, you'd want to implement proper vector search
		const kvKeys = await platform.env.PROFILE_VECTORS.list();
		console.log('Found KV keys:', kvKeys.keys.length);

		const contextChunks: string[] = [];

		// Get all stored vectors and their content
		for (const key of kvKeys.keys.slice(0, 10)) {
			// Limit to first 10 for now
			try {
				const stored = await platform.env.PROFILE_VECTORS.get(key.name);
				if (stored) {
					const data = JSON.parse(stored);
					if (data.content) {
						contextChunks.push(data.content);
					}
				}
			} catch {
				console.warn('Failed to parse stored data for key:', key.name);
			}
		}

		console.log('Retrieved context chunks:', contextChunks.length);

		// Build context from retrieved chunks
		const context = contextChunks.join('\n\n');

		const systemPrompt = `You are an AI assistant representing Mariano Elorga, an AWS Solutions Architect. 
Use the following information about his professional background to answer questions accurately and professionally.

PROFESSIONAL INFORMATION:
${context}

Respond as if you are representing Mariano's professional profile to potential employers or recruiters. Be helpful, accurate, and professional. If asked about something not covered in the provided information, acknowledge that politely and offer to clarify what information is available.`;

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
