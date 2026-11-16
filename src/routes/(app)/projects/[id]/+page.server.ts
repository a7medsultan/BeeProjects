import { error, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { requireProjectManager } from '#lib/server/permissions.ts';
import { archiveProject, unarchiveProject } from '#lib/server/services/projects.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	archive: async (event) => {
		const user = requireUser(event);
		const db = getDb();
		const access = requireProjectManager(db, event.params.id, user);

		if (!access.canArchive) {
			error(403, 'This project is already archived.');
		}

		archiveProject(db, event.params.id, user);
		redirect(303, `/projects/${event.params.id}`);
	},

	unarchive: async (event) => {
		const user = requireUser(event);
		const db = getDb();
		const access = requireProjectManager(db, event.params.id, user);

		if (!access.canUnarchive) {
			error(403, 'This project is not archived.');
		}

		unarchiveProject(db, event.params.id, user);
		redirect(303, `/projects/${event.params.id}`);
	}
};
