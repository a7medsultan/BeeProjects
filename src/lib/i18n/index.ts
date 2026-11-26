import { getContext, setContext } from 'svelte';
import { ar } from './messages/ar.ts';
import { en, type MessageKey } from './messages/en.ts';
import { DEFAULT_LOCALE, dirFor, localeForIntl, type Direction, type Locale } from './locales.ts';

export type TranslationParams = Record<string, string | number | null | undefined>;

const dictionaries: Record<Locale, Record<string, string>> = { en, ar };

const SERVER_MESSAGE_KEYS: Record<string, MessageKey> = {
	'Admin access required': 'errors.adminRequired',
	'Admin access required.': 'errors.adminRequired',
	'Only admins and project managers can create projects': 'errors.createProjectForbidden',
	'Only admins and project managers can create projects.': 'errors.createProjectForbidden',
	'Project not found': 'errors.projectNotFound',
	'Project not found.': 'errors.projectNotFound',
	'Task not found': 'errors.taskNotFound',
	'Task not found.': 'errors.taskNotFound',
	'User not found': 'errors.userNotFound',
	'User not found.': 'errors.userNotFound',
	'Comment not found': 'errors.commentNotFound',
	'Comment not found.': 'errors.commentNotFound',
	'Attachment not found': 'errors.attachmentNotFound',
	'Attachment not found.': 'errors.attachmentNotFound',
	'Attachment file is missing': 'errors.attachmentMissing',
	'Attachment file is missing.': 'errors.attachmentMissing',
	'You cannot manage this project': 'errors.manageProjectForbidden',
	'You cannot manage this project.': 'errors.manageProjectForbidden',
	'Only admins can perform this action': 'errors.adminOnly',
	'Only admins can perform this action.': 'errors.adminOnly',
	'Archived projects are read-only. Unarchive the project first.': 'errors.archivedReadOnly',
	'This project is already archived.': 'errors.archived',
	'This project is not archived.': 'errors.notArchived',
	'Parent task not found in this project': 'errors.parentTaskNotFound',
	'Parent task not found in this project.': 'errors.parentTaskNotFound',
	'You cannot edit this task': 'errors.editTaskForbidden',
	'You cannot edit this task.': 'errors.editTaskForbidden',
	'You cannot delete this task': 'errors.deleteTaskForbidden',
	'You cannot delete this task.': 'errors.deleteTaskForbidden',
	'You cannot edit this comment': 'errors.editCommentForbidden',
	'You cannot edit this comment.': 'errors.editCommentForbidden',
	'You cannot delete this comment': 'errors.deleteCommentForbidden',
	'You cannot delete this comment.': 'errors.deleteCommentForbidden',
	'You cannot delete this attachment': 'errors.deleteAttachmentForbidden',
	'You cannot delete this attachment.': 'errors.deleteAttachmentForbidden',
	'Choose a file to upload.': 'errors.chooseFile',
	'A user with this email address already exists.': 'errors.emailConflict',
	'Select an active user.': 'errors.inactiveUser',
	'The project owner cannot be removed.': 'errors.ownerRemove',
	'This user is not a project member.': 'errors.notProjectMember',
	'Mentions must be active members of this project.': 'errors.mentionMembers',
	'Assignees must be active members of this project.': 'errors.assigneesMembers',
	'The uploaded file is empty.': 'errors.fileEmpty',
	'Files must be 10 MB or smaller.': 'errors.fileTooLarge',
	'The file contents do not match its extension.': 'errors.fileTypeMismatch',
	'Invalid attachment path.': 'errors.invalidAttachmentPath',
	'Members cannot create projects.': 'errors.membersCreateForbidden',
	'Select an active admin or project manager as owner.': 'errors.ownerActive',
	'Only admins can choose another project owner.': 'errors.ownerAdminOnly',
	'The last active admin cannot be demoted.': 'errors.lastAdminDemote',
	'Transfer ownership of this user’s projects first.': 'errors.transferOwnership',
	'You cannot deactivate your own account.': 'errors.cannotDeactivateSelf',
	'The last active admin cannot be deactivated.': 'errors.lastAdminDeactivate',
	'You cannot change your own role.': 'errors.cannotChangeOwnRole',
	'Task is required.': 'errors.taskRequired',
	'Invalid task status.': 'errors.invalidTaskStatus',
	'You cannot move this task.': 'errors.cannotMoveTask',
	'Notification is required.': 'errors.notificationRequired',
	'Select a user to add.': 'errors.selectUser',
	'Select a member to remove.': 'errors.selectMember'
};

function interpolate(template: string, params?: TranslationParams): string {
	if (!params) return template;

	return template.replace(/\{(\w+)\}/g, (match, name: string) => {
		const value = params[name];
		return value === undefined || value === null ? match : String(value);
	});
}

export function translate(locale: Locale, key: MessageKey, params?: TranslationParams): string {
	const template = dictionaries[locale][key] ?? en[key] ?? key;
	return interpolate(template, params);
}

export function translatePlural(
	locale: Locale,
	baseKey: string,
	count: number,
	params?: TranslationParams
): string {
	const category = new Intl.PluralRules(locale).select(count);
	const key = `${baseKey}.${category}`;
	const fallback = `${baseKey}.other`;
	const template =
		dictionaries[locale][key] ??
		dictionaries[locale][fallback] ??
		dictionaries.en[key] ??
		dictionaries.en[fallback] ??
		key;

	return interpolate(template, { count, ...params });
}

export function formatNumber(locale: Locale, value: number): string {
	return new Intl.NumberFormat(localeForIntl(locale)).format(value);
}

export function localizeServerMessage(locale: Locale, message: string): string {
	const normalized = message.trim();
	const key = SERVER_MESSAGE_KEYS[normalized] ?? SERVER_MESSAGE_KEYS[normalized.replace(/\.$/, '')];
	return key ? translate(locale, key) : message;
}

const I18N_KEY = Symbol('beeprojects-i18n');

export interface I18n {
	locale: Locale;
	dir: Direction;
	t: (key: MessageKey, params?: TranslationParams) => string;
	tp: (baseKey: string, count: number, params?: TranslationParams) => string;
}

export function createI18n(locale: Locale): I18n {
	return {
		locale,
		dir: dirFor(locale),
		t: (key, params) => translate(locale, key, params),
		tp: (baseKey, count, params) => translatePlural(locale, baseKey, count, params)
	};
}

export function setI18nContext(locale: Locale): I18n {
	const i18n = createI18n(locale);
	setContext(I18N_KEY, i18n);
	return i18n;
}

export function useI18n(): I18n {
	return getContext<I18n>(I18N_KEY) ?? createI18n(DEFAULT_LOCALE);
}

export type { MessageKey };
export * from './locales.ts';
