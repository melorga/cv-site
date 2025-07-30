import { readFile, readdir } from 'node:fs/promises';
import fetch from 'node-fetch';
import { join } from 'node:path';

const DOCS_DIR = join(process.cwd(), 'src/docs');
const OLLAMA_URL = 'http://localhost:11434/api/embed';  // Default Ollama endpoint

async function run() {
  const files = await readdir(DOCS_DIR);
  for (const file of files) {
    const content = await readFile(join(DOCS_DIR, file), 'utf8');
    const chunks = content.split(/\n\n+/);
    for (let i = 0; i < chunks.length; i++) {
      const res = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'nomic-embed-text', input: chunks[i] })
      });
      const { embeddings } = await res.json();
      await fetch('http://localhost:5173/api/kv', {  // Your local dev server
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: `${file}-chunk-${i}`, value: { content: chunks[i], vector: embeddings[0] } })
      });
      console.log(`Stored chunk ${i} of ${file}`);
    }
  }
}
run();
