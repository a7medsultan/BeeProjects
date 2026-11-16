import { requireAdmin } from '#lib/server/auth/guards.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => {
	requireAdmin(event);
	return {};
};
