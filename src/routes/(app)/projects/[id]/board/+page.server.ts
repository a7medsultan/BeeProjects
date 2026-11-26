import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { TASK_STATUSES } from '#lib/constants.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/permissions.ts';
import { getTaskDetail, listBoardTasks, moveTaskStatus } from '#lib/server/services/tasks.ts';
import { translate } from '#lib/i18n/index.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const db = getDb();
	requireProjectAccess(db, event.params.id, user);

	return {
		tasks: listBoardTasks(db, event.params.id, user)
	};
};

export const actions: Actions = {
	move: async (event) => {
		const user = requireUser(event);
		const db = getDb();
		const formData = await event.request.formData();
		const taskId = String(formData.get('taskId') ?? '');
		const statusResult = z.enum(TASK_STATUSES).safeParse(String(formData.get('status') ?? ''));

		if (!taskId) {
			return fail(400, { error: translate(event.locals.locale, 'errors.taskRequired') });
		}

		if (!statusResult.success) {
			return fail(400, { error: translate(event.locals.locale, 'errors.invalidTaskStatus') });
		}

		const detail = getTaskDetail(db, taskId, user);

		if (!detail || detail.task.projectId !== event.params.id) {
			return fail(404, { error: translate(event.locals.locale, 'errors.taskNotFound') });
		}

		if (!detail.permissions.canEdit) {
			return fail(403, { error: translate(event.locals.locale, 'errors.cannotMoveTask') });
		}

		const updated = moveTaskStatus(db, taskId, statusResult.data, user);

		if (!updated) {
			return fail(404, { error: translate(event.locals.locale, 'errors.taskNotFound') });
		}

		return {
			task: {
				id: taskId,
				status: updated.status,
				completedAt: updated.completedAt
			}
		};
	}
};
