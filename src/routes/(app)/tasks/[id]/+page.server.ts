import { error, fail, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { UPLOAD_DIR } from '$app/env/private';
import { resolve } from 'node:path';
import { createCommentSchema } from '#lib/schemas/collaboration.ts';
import { createTaskFormSchema } from '#lib/schemas/tasks.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getDb } from '#lib/server/db/index.ts';
import { getProjectSummary, listProjectMembers } from '#lib/server/services/projects.ts';
import { listTaskActivity } from '#lib/server/services/activity.ts';
import {
	createComment,
	deleteComment,
	getComment,
	listTaskComments,
	updateComment,
	CommentInputError
} from '#lib/server/services/comments.ts';
import {
	deleteAttachment,
	getAttachmentRecord,
	listTaskAttachments,
	storeAttachment,
	AttachmentError
} from '#lib/server/services/attachments.ts';
import {
	deleteTask,
	getTaskDetail,
	listSubtasks,
	TaskInputError,
	updateTask
} from '#lib/server/services/tasks.ts';
import { localizeServerMessage, translate } from '#lib/i18n/index.ts';
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

	const members = listProjectMembers(db, project.id);
	const assigneeIds = new Set(detail.task.assignees.map((assignee) => assignee.userId));

	return {
		task: detail.task,
		permissions: detail.permissions,
		projectPermissions: detail.projectAccess,
		canCollaborate: detail.projectAccess.isMember && !detail.projectAccess.isArchived,
		project,
		subtasks: listSubtasks(db, detail.task.id, user),
		members: detail.permissions.canManageAssignees
			? members.filter((member) => member.isActive || assigneeIds.has(member.userId))
			: [],
		commentMembers: members.filter((member) => member.isActive),
		comments: listTaskComments(db, detail.task.id),
		attachments: listTaskAttachments(db, detail.task.id),
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
			zod4(createTaskFormSchema(event.locals.locale))
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

		const form = await superValidate(event, zod4(createTaskFormSchema(event.locals.locale)));

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
				return message(
					form,
					{ type: 'error', text: localizeServerMessage(event.locals.locale, error.message) },
					{ status: 400 }
				);
			}

			throw error;
		}

		return message(form, {
			type: 'success',
			text: translate(event.locals.locale, 'server.taskUpdated')
		});
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
	},

	addComment: async (event) => {
		const user = requireUser(event);
		const db = getDb();
		const detail = getTaskDetail(db, event.params.id, user);

		if (!detail) {
			error(404, 'Task not found');
		}

		if (!detail.projectAccess.isMember || detail.projectAccess.isArchived) {
			return fail(403, { commentError: translate(event.locals.locale, 'errors.archivedReadOnly') });
		}

		const formData = await event.request.formData();
		const parsed = createCommentSchema(event.locals.locale).safeParse({
			body: formData.get('body')
		});

		if (!parsed.success) {
			return fail(400, {
				commentError:
					parsed.error.issues[0]?.message ??
					translate(event.locals.locale, 'validation.commentInvalid')
			});
		}

		try {
			createComment(db, {
				taskId: detail.task.id,
				projectId: detail.task.projectId,
				authorId: user.id,
				body: parsed.data.body
			});
		} catch (error) {
			if (error instanceof CommentInputError) {
				return fail(400, {
					commentError: localizeServerMessage(event.locals.locale, error.message)
				});
			}

			throw error;
		}

		return { commentNotice: translate(event.locals.locale, 'server.commentAdded') };
	},

	editComment: async (event) => {
		const user = requireUser(event);
		const db = getDb();
		const formData = await event.request.formData();
		const commentId = String(formData.get('commentId') ?? '');
		const parsed = createCommentSchema(event.locals.locale).safeParse({
			body: formData.get('body')
		});

		if (!parsed.success) {
			return fail(400, {
				commentError:
					parsed.error.issues[0]?.message ??
					translate(event.locals.locale, 'validation.commentInvalid')
			});
		}

		const comment = getComment(db, commentId);

		if (!comment || comment.deleted_at) {
			return fail(404, { commentError: translate(event.locals.locale, 'errors.commentNotFound') });
		}

		const detail = getTaskDetail(db, comment.task_id, user);

		if (!detail) {
			error(404, 'Task not found');
		}

		if (detail.projectAccess.isArchived) {
			return fail(403, { commentError: translate(event.locals.locale, 'errors.archivedReadOnly') });
		}

		const canManage = detail.projectAccess.isAdmin || detail.projectAccess.isOwner;

		if (comment.author_id !== user.id && !canManage) {
			return fail(403, {
				commentError: translate(event.locals.locale, 'errors.editCommentForbidden')
			});
		}

		try {
			updateComment(db, comment, parsed.data.body, user.id, detail.task.projectId);
		} catch (error) {
			if (error instanceof CommentInputError) {
				return fail(400, {
					commentError: localizeServerMessage(event.locals.locale, error.message)
				});
			}

			throw error;
		}

		return { commentNotice: translate(event.locals.locale, 'server.commentUpdated') };
	},

	deleteComment: async (event) => {
		const user = requireUser(event);
		const db = getDb();
		const formData = await event.request.formData();
		const commentId = String(formData.get('commentId') ?? '');
		const comment = getComment(db, commentId);

		if (!comment || comment.deleted_at) {
			return fail(404, { commentError: translate(event.locals.locale, 'errors.commentNotFound') });
		}

		const detail = getTaskDetail(db, comment.task_id, user);

		if (!detail) {
			error(404, 'Task not found');
		}

		if (detail.projectAccess.isArchived) {
			return fail(403, { commentError: translate(event.locals.locale, 'errors.archivedReadOnly') });
		}

		const canManage = detail.projectAccess.isAdmin || detail.projectAccess.isOwner;

		if (comment.author_id !== user.id && !canManage) {
			return fail(403, {
				commentError: translate(event.locals.locale, 'errors.deleteCommentForbidden')
			});
		}

		deleteComment(db, comment, user.id);

		return { commentNotice: translate(event.locals.locale, 'server.commentRemoved') };
	},

	uploadAttachment: async (event) => {
		const user = requireUser(event);
		const db = getDb();
		const detail = getTaskDetail(db, event.params.id, user);

		if (!detail) {
			error(404, 'Task not found');
		}

		if (!detail.projectAccess.isMember || detail.projectAccess.isArchived) {
			return fail(403, {
				attachmentError: translate(event.locals.locale, 'errors.archivedReadOnly')
			});
		}

		const formData = await event.request.formData();
		const file = formData.get('file');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { attachmentError: translate(event.locals.locale, 'errors.chooseFile') });
		}

		try {
			await storeAttachment(
				db,
				resolve(process.cwd(), UPLOAD_DIR),
				detail.task.id,
				{
					buffer: Buffer.from(await file.arrayBuffer()),
					originalName: file.name,
					mimeType: file.type,
					size: file.size
				},
				user
			);
		} catch (error) {
			if (error instanceof AttachmentError) {
				return fail(400, {
					attachmentError: localizeServerMessage(event.locals.locale, error.message)
				});
			}

			throw error;
		}

		return { attachmentNotice: translate(event.locals.locale, 'server.attachmentUploaded') };
	},

	deleteAttachment: async (event) => {
		const user = requireUser(event);
		const db = getDb();
		const formData = await event.request.formData();
		const attachmentId = String(formData.get('attachmentId') ?? '');
		const attachment = getAttachmentRecord(db, attachmentId);

		if (!attachment) {
			return fail(404, {
				attachmentError: translate(event.locals.locale, 'errors.attachmentNotFound')
			});
		}

		const detail = getTaskDetail(db, attachment.taskId, user);

		if (!detail) {
			error(404, 'Task not found');
		}

		if (detail.projectAccess.isArchived) {
			return fail(403, {
				attachmentError: translate(event.locals.locale, 'errors.archivedReadOnly')
			});
		}

		const canManage = detail.projectAccess.isAdmin || detail.projectAccess.isOwner;

		if (attachment.uploadedById !== user.id && !canManage) {
			return fail(403, {
				attachmentError: translate(event.locals.locale, 'errors.deleteAttachmentForbidden')
			});
		}

		deleteAttachment(db, attachment, user);

		return { attachmentNotice: translate(event.locals.locale, 'server.attachmentRemoved') };
	}
};
