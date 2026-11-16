import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '#lib/server/db/index.ts';

export const GET: RequestHandler = async () => {
	try {
		getDb().prepare('SELECT 1 AS ok').get();
		return json({ ok: true, service: 'beeprojects' }, { headers: { 'cache-control': 'no-store' } });
	} catch (error) {
		console.error('[health] database check failed', error);
		return json(
			{ ok: false, service: 'beeprojects' },
			{ status: 503, headers: { 'cache-control': 'no-store' } }
		);
	}
};
