// src/hooks.server.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';  // pnpm add rate-limiter-flexible@latest
const limiter = new RateLimiterMemory({ points: 60, duration: 60 });  // 60 req/min

export async function handle({ event, resolve }) {
  try {
    await limiter.consume(event.request.headers.get('cf-connecting-ip') || 'anon', 1);
  } catch {
    return new Response('Rate limited', { status: 429 });
  }
  return resolve(event);
}

