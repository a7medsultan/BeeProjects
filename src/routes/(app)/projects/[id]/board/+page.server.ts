import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { TASK_STATUSES } from '#lib/constants.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/permissions.ts';
import { getTaskDetail, listBoardTasks, moveTaskStatus } from '#lib/server/services/tasks.ts';
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
			return fail(400, { error: 'Task is required.' });
		}

		if (!statusResult.success) {
			return fail(400, { error: 'Invalid task status.' });
		}

		const detail = getTaskDetail(db, taskId, user);

		if (!detail || detail.task.projectId !== event.params.id) {
			return fail(404, { error: 'Task not found.' });
		}

		if (!detail.permissions.canEdit) {
			return fail(403, { error: 'You cannot move this task.' });
		}

		const updated = moveTaskStatus(db, taskId, statusResult.data, user);

		if (!updated) {
			return fail(404, { error: 'Task not found.' });
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
