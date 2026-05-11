import { describe, it, expect, beforeEach } from 'vitest';
import {
	perIpDailyChatCap,
	authAttemptFailed,
	isAuthLockedOut,
	clearAuthLockout,
	DAILY_CAP,
	LOCKOUT_THRESHOLD
} from '../rate-limit';

function fakeKV(): KVNamespace {
	const store = new Map<string, string>();
	return {
		async get(key: string) {
			return store.get(key) ?? null;
		},
		async put(key: string, value: string) {
			store.set(key, value);
		},
		async delete(key: string) {
			store.delete(key);
		}
	} as unknown as KVNamespace;
}

describe('rate-limit', () => {
	let kv: KVNamespace;
	beforeEach(() => {
		kv = fakeKV();
	});

	it('exposes the daily cap and lockout threshold', () => {
		expect(DAILY_CAP).toBe(200);
		expect(LOCKOUT_THRESHOLD).toBe(5);
	});

	it('allows requests under the daily cap', async () => {
		for (let i = 0; i < DAILY_CAP; i++) {
			expect(await perIpDailyChatCap(kv, 'ip1')).toBe(true);
		}
	});

	it('blocks once over the daily cap', async () => {
		for (let i = 0; i < DAILY_CAP; i++) await perIpDailyChatCap(kv, 'ip1');
		expect(await perIpDailyChatCap(kv, 'ip1')).toBe(false);
	});

	it('caps are independent across IPs', async () => {
		for (let i = 0; i < DAILY_CAP; i++) await perIpDailyChatCap(kv, 'ip1');
		expect(await perIpDailyChatCap(kv, 'ip2')).toBe(true);
	});

	it('reports not-locked-out when under threshold', async () => {
		for (let i = 0; i < LOCKOUT_THRESHOLD - 1; i++) await authAttemptFailed(kv, 'ip1');
		expect(await isAuthLockedOut(kv, 'ip1')).toBe(false);
	});

	it('reports locked-out at threshold', async () => {
		for (let i = 0; i < LOCKOUT_THRESHOLD; i++) await authAttemptFailed(kv, 'ip1');
		expect(await isAuthLockedOut(kv, 'ip1')).toBe(true);
	});

	it('clearAuthLockout resets the counter', async () => {
		for (let i = 0; i < LOCKOUT_THRESHOLD; i++) await authAttemptFailed(kv, 'ip1');
		await clearAuthLockout(kv, 'ip1');
		expect(await isAuthLockedOut(kv, 'ip1')).toBe(false);
	});
});
