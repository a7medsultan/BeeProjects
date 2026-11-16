import { error, fail, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { taskFormSchema } from '#lib/schemas/tasks.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { getProjectSummary, listProjectMembers } from '#lib/server/services/projects.ts';
import { listTaskActivity } from '#lib/server/services/activity.ts';
import {
	deleteTask,
	getTaskDetail,
	listSubtasks,
	TaskInputError,
	updateTask
} from '#lib/server/services/tasks.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const db = getDb();
	const detail = getTaskDetail(db, event.params.id, user);

	if (!detail) {
		error(404, 'Task not found');
	}

	const project = getProjectSummary(db, detail.task.projectId, user);

	if (!project) {
		error(404, 'Project not found');
	}

	const assigneeIds = new Set(detail.task.assignees.map((assignee) => assignee.userId));

	return {
		task: detail.task,
		permissions: detail.permissions,
		project,
		subtasks: listSubtasks(db, detail.task.id, user),
		members: detail.permissions.canManageAssignees
			? listProjectMembers(db, project.id).filter(
					(member) => member.isActive || assigneeIds.has(member.userId)
				)
			: [],
		activity: listTaskActivity(db, detail.task.id, 1, 20),
		form: await superValidate(
			{
				title: detail.task.title,
				description: detail.task.description,
				priority: detail.task.priority,
				status: detail.task.status,
				startDate: detail.task.startDate ?? '',
				dueDate: detail.task.dueDate ?? '',
				assigneeIds: detail.task.assignees.map((assignee) => assignee.userId)
			},
			zod4(taskFormSchema)
		)
	};
};

export const actions: Actions = {
	update: async (event) => {
		const user = requireUser(event);
		const db = getDb();
		const detail = getTaskDetail(db, event.params.id, user);

		if (!detail) {
			error(404, 'Task not found');
		}

		if (!detail.permissions.canEdit) {
			error(403, 'You cannot edit this task');
		}

		const form = await superValidate(event, zod4(taskFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			updateTask(
				db,
				detail.task.id,
				{
					...form.data,
					assigneeIds: detail.permissions.canManageAssignees
						? form.data.assigneeIds
						: detail.task.assignees.map((assignee) => assignee.userId)
				},
				user,
				detail.projectAccess
			);
		} catch (error) {
			if (error instanceof TaskInputError) {
				return message(form, { type: 'error', text: error.message }, { status: 400 });
			}

			throw error;
		}

		return message(form, { type: 'success', text: 'Task updated.' });
	},

	delete: async (event) => {
		const user = requireUser(event);
		const db = getDb();
		const detail = getTaskDetail(db, event.params.id, user);

		if (!detail) {
			error(404, 'Task not found');
		}

		if (!detail.permissions.canDelete) {
			error(403, 'You cannot delete this task');
		}

		const projectId = deleteTask(db, detail.task.id, user);

		if (!projectId) {
			error(404, 'Task not found');
		}

		redirect(303, `/projects/${projectId}/list`);
	}
};
