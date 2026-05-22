#!/usr/bin/env node
/**
 * Minimal Groq smoke test.
 *
 * Usage:
 *   GROQ_API_KEY=gsk_… node scripts/groq-test.mjs [model] [prompt]
 *   node --env-file=.env.local scripts/groq-test.mjs [model] [prompt]
 *   pnpm test:groq                                       # default model + prompt
 *   pnpm test:groq llama-3.3-70b-versatile               # custom model
 *   pnpm test:groq llama-3.1-8b-instant "What is 2+2?"   # custom prompt
 *
 * Defaults: model = llama-3.1-8b-instant, prompt = a short echo request.
 *
 * Exits with code 0 on success, 1 on Groq error, 2 on misconfiguration.
 */

import Groq from 'groq-sdk';

const FALLBACK_MODEL = 'llama-3.1-8b-instant';
const DEFAULT_PROMPT = 'Reply with one short sentence to confirm you received this.';

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
	console.error('ERROR: GROQ_API_KEY env var is required.');
	console.error('  Set it inline: GROQ_API_KEY=gsk_… node scripts/groq-test.mjs');
	console.error('  Or load .env.local: node --env-file=.env.local scripts/groq-test.mjs');
	process.exit(2);
}

// Precedence: positional arg > GROQ_MODEL env var > FALLBACK_MODEL. Mirrors
// the server's /api/chat selection so this script tests what prod runs.
const model = process.argv[2] || process.env.GROQ_MODEL || FALLBACK_MODEL;
const prompt = process.argv[3] || DEFAULT_PROMPT;

console.log(`→ model:  ${model}`);
console.log(`→ prompt: ${JSON.stringify(prompt)}`);
console.log('');

const groq = new Groq({ apiKey });

const started = Date.now();
try {
	const completion = await groq.chat.completions.create({
		model,
		max_tokens: 200,
		temperature: 0.4,
		messages: [
			{ role: 'system', content: 'You are a diagnostic echo. Reply briefly.' },
			{ role: 'user', content: prompt }
		]
	});
	const elapsedMs = Date.now() - started;

	const text = completion.choices?.[0]?.message?.content?.trim() ?? '(empty response)';
	const usage = completion.usage;

	console.log(`✓ ok in ${elapsedMs} ms`);
	if (usage) {
		console.log(
			`✓ tokens: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total`
		);
	}
	console.log('--- response ---');
	console.log(text);
	process.exit(0);
} catch (err) {
	const elapsedMs = Date.now() - started;
	console.error(`✗ failed after ${elapsedMs} ms`);
	if (err && typeof err === 'object') {
		if ('status' in err) console.error(`  status:  ${err.status}`);
		if ('error' in err && err.error) console.error(`  body:    ${JSON.stringify(err.error)}`);
		else if ('message' in err) console.error(`  message: ${err.message}`);
	} else {
		console.error(err);
	}

	// Hint at the common failure modes.
	const message = String(err?.message ?? err?.error?.message ?? '');
	if (/invalid.*api.*key/i.test(message))
		console.error('\nHint: rotate the key at https://console.groq.com/keys.');
	else if (/model.*(decommissioned|not.*found)/i.test(message))
		console.error(
			`\nHint: model "${model}" may be retired. See https://console.groq.com/docs/deprecations.`
		);

	process.exit(1);
}
