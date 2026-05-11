import { describe, it, expect } from 'vitest';
import { issueSessionCookie, verifySessionCookie } from '../session';

const SECRET = 'test-secret-32-chars-min-length-x';

describe('session', () => {
	it('issues a cookie and verifies it round-trip', async () => {
		const cookie = await issueSessionCookie({ uid: 'u-1', email: 'a@b.c' }, SECRET, 3600);
		const result = await verifySessionCookie(cookie, SECRET);
		expect(result).toEqual({ uid: 'u-1', email: 'a@b.c' });
	});

	it('rejects a tampered signature', async () => {
		const cookie = await issueSessionCookie({ uid: 'u-1', email: 'a@b.c' }, SECRET, 3600);
		const tampered = cookie.replace(/.$/, 'x');
		expect(await verifySessionCookie(tampered, SECRET)).toBeNull();
	});

	it('rejects an expired cookie', async () => {
		const cookie = await issueSessionCookie({ uid: 'u-1', email: 'a@b.c' }, SECRET, -1);
		expect(await verifySessionCookie(cookie, SECRET)).toBeNull();
	});

	it('rejects malformed input', async () => {
		expect(await verifySessionCookie('not-a-cookie', SECRET)).toBeNull();
		expect(await verifySessionCookie('', SECRET)).toBeNull();
		expect(await verifySessionCookie('only.one', SECRET)).toBeNull();
	});

	it('rejects a different secret', async () => {
		const cookie = await issueSessionCookie({ uid: 'u-1', email: 'a@b.c' }, SECRET, 3600);
		expect(await verifySessionCookie(cookie, 'different-secret-of-equal-length-x')).toBeNull();
	});
});
