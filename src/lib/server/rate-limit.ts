/**
 * KV-backed rate-limit and lockout helpers.
 *
 * - Per-IP daily chat cap: 200 requests / 24h.
 * - Auth lockout: 5 failed sign-ins per IP in 15 min → locked.
 */

export const DAILY_CAP = 200;
export const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_SECONDS = 15 * 60;
const DAILY_WINDOW_SECONDS = 24 * 60 * 60;

function dayKey(ip: string): string {
	const day = Math.floor(Date.now() / 86_400_000);
	return `chat-cap:${day}:${ip}`;
}

function lockoutKey(ip: string): string {
	return `auth-lockout:${ip}`;
}

async function readInt(kv: KVNamespace, key: string): Promise<number> {
	const raw = await kv.get(key);
	if (!raw) return 0;
	const n = parseInt(raw, 10);
	return Number.isFinite(n) ? n : 0;
}

/** Increments daily counter. Returns true if request allowed, false if cap exceeded. */
export async function perIpDailyChatCap(kv: KVNamespace, ip: string): Promise<boolean> {
	const key = dayKey(ip);
	const current = await readInt(kv, key);
	if (current >= DAILY_CAP) return false;
	await kv.put(key, String(current + 1), { expirationTtl: DAILY_WINDOW_SECONDS });
	return true;
}

export async function authAttemptFailed(kv: KVNamespace, ip: string): Promise<number> {
	const key = lockoutKey(ip);
	const current = await readInt(kv, key);
	const next = current + 1;
	await kv.put(key, String(next), { expirationTtl: LOCKOUT_WINDOW_SECONDS });
	return next;
}

export async function isAuthLockedOut(kv: KVNamespace, ip: string): Promise<boolean> {
	const current = await readInt(kv, lockoutKey(ip));
	return current >= LOCKOUT_THRESHOLD;
}

export async function clearAuthLockout(kv: KVNamespace, ip: string): Promise<void> {
	await kv.delete(lockoutKey(ip));
}
