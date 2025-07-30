import { readFile, readdir } from 'node:fs/promises';
import fetch from 'node-fetch';
import { join } from 'node:path';

const DOCS_DIR = join(process.cwd(), 'src/docs');
const DEV_SERVER_URL = process.env.DEV_SERVER_URL || 'http://localhost:8788';  // Wrangler default
const OLLAMA_URL = 'http://localhost:11434/api/embed';
const MODEL = 'nomic-embed-text';
const RETRIES = 3;

async function fetchWithRetry(url, options, retries = RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      const text = await res.text();  // Consume body once
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(`JSON parse failed: ${e.message}`); }
      console.log(`Success on attempt ${attempt}: ${JSON.stringify(data)}`);
      return data;
    } catch (err) {
      console.error(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

async function run() {
  const files = await readdir(DOCS_DIR);
  for (const file of files) {
    console.log(`Processing file: ${file}`);
    const content = await readFile(join(DOCS_DIR, file), 'utf8');
    const chunks = content.split(/\n\n+/).filter(c => c.trim());
    console.log(`Split into ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      console.log(`Embedding chunk ${i} (length: ${chunks[i].length})`);
      const ollamaData = await fetchWithRetry(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, input: chunks[i] })
      });
      const vector = ollamaData.embeddings[0];
      console.log(`Embedding generated (dim: ${vector.length})`);

      console.log(`Storing to KV...`);
      await fetchWithRetry(`${DEV_SERVER_URL}/api/kv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: `${file}-chunk-${i}`, value: { content: chunks[i], vector } })
      });

      console.log(`Verifying KV entry...`);
      const verifyData = await fetchWithRetry(`${DEV_SERVER_URL}/api/kv-get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: `${file}-chunk-${i}` })
      });
      if (verifyData.value) {
        console.log(`Verified: Chunk ${i} stored (content preview: ${verifyData.value.content.slice(0, 50)}...)`);
      } else {
        throw new Error(`Verification failed for chunk ${i}`);
      }
    }
  }
  console.log('All chunks processed and verified!');
}
run();
