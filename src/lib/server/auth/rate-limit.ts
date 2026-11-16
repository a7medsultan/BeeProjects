const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const MAX_TRACKED_KEYS = 5_000;

const attempts = new Map<string, number[]>();

function prune(key: string, now: number): number[] {
	const timestamps = attempts.get(key);
	if (!timestamps) return [];

	const fresh = timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);

	if (fresh.length > 0) {
		attempts.set(key, fresh);
	} else {
		attempts.delete(key);
	}

	return fresh;
}

function trimStore(): void {
	if (attempts.size <= MAX_TRACKED_KEYS) return;

	// Under heavy abuse, drop the oldest entries. Rate limiting is best-effort
	// on a single instance; the goal is to avoid unbounded memory growth.
	const entries = [...attempts.entries()].sort((a, b) => (a[1].at(-1) ?? 0) - (b[1].at(-1) ?? 0));

	for (const [key] of entries) {
		attempts.delete(key);
		if (attempts.size <= MAX_TRACKED_KEYS / 2) break;
	}
}

export interface RateLimitStatus {
	limited: boolean;
	retryAfterSeconds: number;
}

export function isRateLimited(key: string): RateLimitStatus {
	const now = Date.now();
	const timestamps = prune(key, now);

	if (timestamps.length < MAX_ATTEMPTS) {
		return { limited: false, retryAfterSeconds: 0 };
	}

	const oldest = timestamps[0];
	const retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000));

	return { limited: true, retryAfterSeconds };
}

export function recordFailure(key: string): void {
	const now = Date.now();
	const timestamps = prune(key, now);
	timestamps.push(now);
	attempts.set(key, timestamps);
	trimStore();
}

export function resetRateLimit(key: string): void {
	attempts.delete(key);
}

export function rateLimitKeys(ip: string, email: string): string[] {
	const normalizedEmail = email.trim().toLowerCase();
	return [`ip:${ip}`, `ip-email:${ip}:${normalizedEmail}`];
}

export function checkRateLimits(keys: string[]): RateLimitStatus {
	let retryAfterSeconds = 0;

	for (const key of keys) {
		const status = isRateLimited(key);
		if (status.limited) {
			retryAfterSeconds = Math.max(retryAfterSeconds, status.retryAfterSeconds);
		}
	}

	return { limited: retryAfterSeconds > 0, retryAfterSeconds };
}

export function recordFailures(keys: string[]): void {
	for (const key of keys) recordFailure(key);
}

export function resetRateLimits(keys: string[]): void {
	for (const key of keys) resetRateLimit(key);
}
