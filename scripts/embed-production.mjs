import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import fetch from 'node-fetch';

const DOCS_DIR = join(process.cwd(), 'src/docs');
const OLLAMA_URL = 'http://localhost:11434/api/embed';
const MODEL = 'nomic-embed-text';
const RETRIES = 3;
const KV_NAMESPACE_ID = '7c958fcfb13b44d491294373f0363330'; // Your PROFILE_VECTORS namespace ID

async function fetchWithRetry(url, options, retries = RETRIES) {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const res = await fetch(url, options);
			const text = await res.text();
			if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
			let data;
			try {
				data = JSON.parse(text);
			} catch (e) {
				throw new Error(`JSON parse failed: ${e.message}`);
			}
			console.log(`✅ Embedding generated on attempt ${attempt}`);
			return data;
		} catch (err) {
			console.error(`❌ Attempt ${attempt} failed: ${err.message}`);
			if (attempt === retries) throw err;
			await new Promise((r) => setTimeout(r, 1000 * attempt));
		}
	}
}

async function storeInKV(key, value) {
	try {
		// Create a temporary file with the value
		const tempFile = `/tmp/kv-${Date.now()}.json`;
		await writeFile(tempFile, JSON.stringify(value));
		
		// Use Wrangler to put the value in KV
		const command = `pnpm wrangler kv key put "${key}" --path="${tempFile}" --namespace-id="${KV_NAMESPACE_ID}"`;
		console.log(`📦 Storing to KV: ${key}`);
		execSync(command, { stdio: 'inherit' });
		
		// Clean up temp file
		execSync(`rm "${tempFile}"`);
		
		console.log(`✅ Successfully stored: ${key}`);
	} catch (error) {
		console.error(`❌ Failed to store ${key}:`, error.message);
		throw error;
	}
}

async function run() {
	console.log('🚀 Starting embedding generation for production...');
	
	// Check if Ollama is running
	try {
		await fetch('http://localhost:11434/api/tags');
		console.log('✅ Ollama is running');
	} catch (error) {
		console.error('❌ Ollama is not running. Please start Ollama first with: ollama serve');
		process.exit(1);
	}

	// Check if the required model is available
	try {
		await fetchWithRetry(OLLAMA_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ model: MODEL, input: 'test' })
		});
		console.log(`✅ Model ${MODEL} is available`);
	} catch (error) {
		console.error(`❌ Model ${MODEL} not found. Please install it with: ollama pull ${MODEL}`);
		process.exit(1);
	}

	const files = await readdir(DOCS_DIR);
	let totalChunks = 0;
	
	for (const file of files) {
		console.log(`\n📄 Processing file: ${file}`);
		const content = await readFile(join(DOCS_DIR, file), 'utf8');
		const chunks = content.split(/\n\n+/).filter((c) => c.trim());
		console.log(`📊 Split into ${chunks.length} chunks`);

		for (let i = 0; i < chunks.length; i++) {
			const chunkKey = `${file}-chunk-${i}`;
			console.log(`\n🔄 Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
			
			try {
				// Generate embedding with Ollama
				const ollamaData = await fetchWithRetry(OLLAMA_URL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ model: MODEL, input: chunks[i] })
				});
				
				const vector = ollamaData.embeddings[0];
				console.log(`🧮 Embedding generated (${vector.length} dimensions)`);

				// Store in Cloudflare KV via Wrangler
				const kvValue = {
					content: chunks[i],
					vector: vector,
					timestamp: new Date().toISOString(),
					file: file,
					chunkIndex: i
				};

				await storeInKV(chunkKey, kvValue);
				totalChunks++;
				
			} catch (error) {
				console.error(`❌ Failed to process chunk ${i}:`, error.message);
				throw error;
			}
		}
	}
	
	console.log(`\n🎉 Successfully processed ${totalChunks} chunks!`);
	console.log('✅ All embeddings have been stored in Cloudflare KV');
}

run().catch((error) => {
	console.error('💥 Script failed:', error);
	process.exit(1);
});
