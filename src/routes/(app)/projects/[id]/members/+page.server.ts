import { fail } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { requireProjectAccess, requireProjectManageable } from '#lib/server/permissions.ts';
import {
	addProjectMember,
	listMemberCandidates,
	listProjectMembers,
	ProjectMemberError,
	removeProjectMember
} from '#lib/server/services/projects.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const db = getDb();
	const access = requireProjectAccess(db, event.params.id, user);

	return {
		members: listProjectMembers(db, event.params.id),
		candidates: access.canAddMembers ? listMemberCandidates(db, event.params.id) : []
	};
};

export const actions: Actions = {
	add: async (event) => {
		const user = requireUser(event);
		const db = getDb();
		requireProjectManageable(db, event.params.id, user);

		const formData = await event.request.formData();
		const userId = String(formData.get('userId') ?? '');

		if (!userId) {
			return fail(400, { error: 'Select a user to add.' });
		}

		try {
			const added = addProjectMember(db, event.params.id, userId, user);

			return added
				? { notice: 'Member added to the project.' }
				: { notice: 'That user is already a project member.' };
		} catch (error) {
			if (error instanceof ProjectMemberError) {
				return fail(400, { error: error.message });
			}

			throw error;
		}
	},

	remove: async (event) => {
		const user = requireUser(event);
		const db = getDb();
		requireProjectManageable(db, event.params.id, user);

		const formData = await event.request.formData();
		const userId = String(formData.get('userId') ?? '');

		if (!userId) {
			return fail(400, { error: 'Select a member to remove.' });
		}

		try {
			removeProjectMember(db, event.params.id, userId, user);
			return { notice: 'Member removed from the project.' };
		} catch (error) {
			if (error instanceof ProjectMemberError) {
				return fail(400, { error: error.message });
			}

			throw error;
		}
	}
};
