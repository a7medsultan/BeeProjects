import { getDb } from './db/index.ts';
import { deleteExpiredSessions } from './auth/session.ts';

let timer: ReturnType<typeof setInterval> | null = null;

function runMaintenance(): void {
	try {
		deleteExpiredSessions(getDb());
	} catch (error) {
		console.error('[jobs] maintenance failed', error);
	}
}

/**
 * Starts the in-process background jobs.
 * Deadline reminder jobs are added in milestone M6.
 */
export function startJobs(): void {
	if (timer) return;
	runMaintenance();
	timer = setInterval(runMaintenance, 60 * 60 * 1000);
	timer.unref?.();
}

export function stopJobs(): void {
	if (!timer) return;
	clearInterval(timer);
	timer = null;
}
