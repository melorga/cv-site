import Groq from 'groq-sdk';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const DOCS_DIR = join(process.cwd(), 'src/docs');
async function run() {
  const files = await readdir(DOCS_DIR);
  for (const file of files) {
    const content = await readFile(join(DOCS_DIR, file), 'utf-8');
    const chunks = content.split(/\n\n+/);
    for (let i = 0; i < chunks.length; i++) {
      const { data } = await groq.embeddings.create({ model: 'text-embedding-3-small', input: chunks[i] });
      // POST to temp /api/kv endpoint to store in KV
    }
  }
}
run();

