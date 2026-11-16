import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/permissions.ts';
import { getProjectSummary, listProjectMembers } from '#lib/server/services/projects.ts';
import { listRecentProjectActivity } from '#lib/server/services/activity.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const user = requireUser(event);
	const db = getDb();
	const permissions = requireProjectAccess(db, event.params.id, user);
	const project = getProjectSummary(db, event.params.id, user);

	if (!project) {
		error(404, 'Project not found');
	}

	return {
		project,
		permissions,
		members: listProjectMembers(db, project.id),
		recentActivity: listRecentProjectActivity(db, project.id, 5)
	};
};
