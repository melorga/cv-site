// scripts/embed.mjs
import Groq from 'groq-sdk';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const DOCS_DIR = join(process.cwd(), 'src/docs');

async function embedAndStore() {
	const files = await readdir(DOCS_DIR);
	for (const file of files) {
		const content = await readFile(join(DOCS_DIR, file), 'utf-8');
		const chunks = content.split(/\n\n+/).filter((c) => c.trim()); // Split into paragraphs
		for (let i = 0; i < chunks.length; i++) {
			const { data } = await groq.embeddings.create({
				model: 'text-embedding-3-small', // Free, efficient model
				input: chunks[i]
			});
			const vector = data[0].embedding;
			// Store via temp endpoint (add in Step 5)
			await fetch('http://localhost:5173/api/kv', {
				// Use your dev port
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key: `${file}-chunk-${i}`, value: { content: chunks[i], vector } })
			});
			console.log(`Stored ${file}-chunk-${i}`);
		}
	}
	console.log('Done!');
}

embedAndStore().catch(console.error);
