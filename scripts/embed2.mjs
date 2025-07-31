import OpenAI from 'openai';
import { readFile, readdir } from 'node:fs/promises';
import fetch from 'node-fetch';
import { join } from 'node:path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DOCS_DIR = join(process.cwd(), 'src/docs');

async function run() {
	const files = await readdir(DOCS_DIR);
	for (const file of files) {
		const content = await readFile(join(DOCS_DIR, file), 'utf8');
		const chunks = content.split(/\n\n+/);
		for (let i = 0; i < chunks.length; i++) {
			const { data } = await openai.embeddings.create({
				input: chunks[i],
				model: 'text-embedding-3-small' // Now using OpenAI's actual model
			});
			await fetch('http://localhost:5173/api/kv', {
				// Assumes dev server on port 5173
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					key: `${file}-chunk-${i}`,
					value: { content: chunks[i], vector: data[0].embedding }
				})
			});
			console.log(`Stored chunk ${i} of ${file}`);
		}
	}
}
run();
