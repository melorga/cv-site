import { describe, it, expect, vi } from 'vitest';
import { logVisitor, hashIp } from '../visitor-log';

const SALT = 'test-salt-min-32-chars-padded-to-x';

describe('visitor-log', () => {
	it('produces a deterministic IP hash with the same salt', async () => {
		const a = await hashIp('1.2.3.4', SALT);
		const b = await hashIp('1.2.3.4', SALT);
		expect(a).toBe(b);
		expect(a).not.toBe('1.2.3.4');
		expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
	});

	it('produces a different hash with a different salt', async () => {
		const a = await hashIp('1.2.3.4', SALT);
		const b = await hashIp('1.2.3.4', 'different-salt-min-32-chars-padded-x');
		expect(a).not.toBe(b);
	});

	it('writes a KV entry with hashed IP and never the raw IP', async () => {
		const put = vi.fn().mockResolvedValue(undefined);
		const kv = { put } as unknown as KVNamespace;
		await logVisitor(kv, { ip: '1.2.3.4', email: 'a@b.c', userAgent: 'TestUA' }, SALT);
		expect(put).toHaveBeenCalledOnce();
		const [key, value] = put.mock.calls[0];
		expect(key).toMatch(/^visitor:/);
		const stored = JSON.parse(value as string);
		expect(stored.hashedIp).not.toBe('1.2.3.4');
		expect(stored.email).toBe('a@b.c');
		expect(stored.userAgent).toBe('TestUA');
		expect(stored.timestamp).toBeTypeOf('number');
		expect(JSON.stringify(stored)).not.toContain('1.2.3.4');
	});
});
