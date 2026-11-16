import type { RoleName } from './types.ts';

export const ROLE_LABELS: Record<RoleName, string> = {
	admin: 'Admin',
	project_manager: 'Project Manager',
	member: 'Member'
};

export const ROLE_OPTIONS: Array<{ value: RoleName; label: string }> = [
	{ value: 'admin', label: ROLE_LABELS.admin },
	{ value: 'project_manager', label: ROLE_LABELS.project_manager },
	{ value: 'member', label: ROLE_LABELS.member }
];
