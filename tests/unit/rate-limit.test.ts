import { describe, expect, it } from 'vitest';
import {
	checkRateLimits,
	isRateLimited,
	rateLimitKeys,
	recordFailure,
	resetRateLimit
} from '../../src/lib/server/auth/rate-limit.ts';

describe('login rate limiting', () => {
	it('allows ten attempts and blocks the eleventh', () => {
		const key = `test:${crypto.randomUUID()}`;

		for (let attempt = 1; attempt <= 10; attempt += 1) {
			expect(isRateLimited(key).limited).toBe(false);
			recordFailure(key);
		}

		const status = isRateLimited(key);
		expect(status.limited).toBe(true);
		expect(status.retryAfterSeconds).toBeGreaterThan(0);

		resetRateLimit(key);
		expect(isRateLimited(key).limited).toBe(false);
	});

	it('normalizes email addresses into per-IP keys', () => {
		expect(rateLimitKeys('203.0.113.5', '  User@Example.COM ')).toEqual([
			'ip:203.0.113.5',
			'ip-email:203.0.113.5:user@example.com'
		]);
	});

	it('reports the longest retry window across keys', () => {
		const first = `test:${crypto.randomUUID()}`;
		const second = `test:${crypto.randomUUID()}`;

		for (let attempt = 0; attempt < 10; attempt += 1) {
			recordFailure(first);
			recordFailure(second);
		}

		const status = checkRateLimits([first, second]);
		expect(status.limited).toBe(true);
		expect(status.retryAfterSeconds).toBeGreaterThan(0);

		resetRateLimit(first);
		resetRateLimit(second);
	});
});
