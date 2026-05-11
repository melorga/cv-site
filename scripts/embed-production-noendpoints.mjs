import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import fetch from 'node-fetch';
import process from 'node:process';

const DOCS_DIR = join(process.cwd(), 'docs');
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/embeddings';
const MODEL = 'nomic-embed-text';
const RETRIES = 3;

// Cloudflare KV credentials (must come from environment variables)
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_KV_NAMESPACE_ID = process.env.CF_KV_NAMESPACE_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = RETRIES) {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const res = await fetch(url, options);
			const text = await res.text();

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}: ${text}`);
			}

			try {
				return JSON.parse(text);
			} catch {
				return text; // For body-less or string responses
			}
		} catch (err) {
			console.error(`Attempt ${attempt} failed: ${err.message}`);
			if (attempt === retries) throw err;
			await sleep(1000 * attempt);
		}
	}
	return null;
}

async function run() {
	if (!CF_ACCOUNT_ID || !CF_KV_NAMESPACE_ID || !CF_API_TOKEN) {
		throw new Error('Missing CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, or CF_API_TOKEN environment vars');
	}

	const files = await readdir(DOCS_DIR);
	for (const file of files) {
		if (!file.endsWith('.md')) continue;

		console.log(`📄 Processing file: ${file}`);
		const content = await readFile(join(DOCS_DIR, file), 'utf8');
		const chunks = content.split(/\n{2,}/).filter((chunk) => chunk.trim());

		console.log(`🔹 Split into ${chunks.length} chunks`);

		// Hierarchical key scheme to avoid overwrites: docs/{fileBase}/{runId}/chunk-{i}
		const fileBase = file.replace(/\.md$/i, '');
		const runId = Date.now();
		const basePrefix = `docs/${fileBase}/${runId}`;

		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i].trim();
			const key = `${basePrefix}/chunk-${i}`;
			console.log(`🧠 Embedding chunk ${i} (length: ${chunk.length})`);

			const embeddingResponse = await fetchWithRetry(OLLAMA_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: MODEL, prompt: chunk })
			});

			const vector = embeddingResponse.embedding;
			if (!vector || !Array.isArray(vector)) {
				throw new Error(`Invalid embedding data from Ollama for chunk ${i}`);
			}

			const value = JSON.stringify({
				content: chunk,
				vector,
				meta: {
					file,
					fileBase,
					runId,
					chunkIndex: i,
					createdAt: new Date().toISOString()
				}
			});

			const writeUrl =
				`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}` +
				`/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}/values/${encodeURIComponent(key)}`;

			await fetchWithRetry(writeUrl, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${CF_API_TOKEN}`,
					'Content-Type': 'application/json'
				},
				body: value
			});

			// Optional verification (GET)
			const verifyUrl = writeUrl;
			const verifyData = await fetchWithRetry(verifyUrl, {
				method: 'GET',
				headers: { Authorization: `Bearer ${CF_API_TOKEN}` }
			});

			try {
				const parsed = typeof verifyData === 'string' ? JSON.parse(verifyData) : verifyData;
				const preview = typeof parsed?.content === 'string' ? parsed.content.slice(0, 60) : '';
				console.log(`✅ Verified: ${key} (content preview: "${preview}...")`);
			} catch {
				console.warn(`⚠️ Verification failed (non-JSON): ${key}`);
			}
		}
	}

	console.log('🎉 All files processed and uploaded to KV!');
}

run().catch((err) => {
	console.error(`❌ Error: ${err.message}`);
	process.exit(1);
});
