import { error } from '@sveltejs/kit';
import type Database from 'better-sqlite3';
import type { ProjectPermissions, PublicUser } from '#lib/types.ts';

export interface ProjectAccess extends ProjectPermissions {
	projectId: string;
}

export function getProjectAccess(
	db: Database.Database,
	projectId: string,
	user: PublicUser
): ProjectAccess | null {
	const project = db
		.prepare('SELECT owner_id, status FROM projects WHERE id = ?')
		.get(projectId) as { owner_id: string; status: string } | undefined;

	if (!project) return null;

	const isAdmin = user.role === 'admin';
	const isOwner = project.owner_id === user.id;
	const isMember = db
		.prepare('SELECT 1 AS ok FROM project_members WHERE project_id = ? AND user_id = ?')
		.get(projectId, user.id);

	if (!isAdmin && !isOwner && !isMember) return null;

	const isManager = isAdmin || isOwner;
	const isArchived = project.status === 'Archived';

	return {
		projectId,
		isAdmin,
		isOwner,
		isMember: true,
		isManager,
		isArchived,
		canManage: isManager && !isArchived,
		canArchive: isManager && !isArchived,
		canUnarchive: isManager && isArchived,
		canReassignOwner: isAdmin && !isArchived,
		canAddMembers: isManager && !isArchived,
		canRemoveMembers: isManager && !isArchived
	};
}

export function requireProjectAccess(
	db: Database.Database,
	projectId: string,
	user: PublicUser
): ProjectAccess {
	const access = getProjectAccess(db, projectId, user);

	if (!access) {
		error(404, 'Project not found');
	}

	return access;
}

export function requireProjectManager(
	db: Database.Database,
	projectId: string,
	user: PublicUser
): ProjectAccess {
	const access = requireProjectAccess(db, projectId, user);

	if (!access.isManager) {
		error(403, 'You cannot manage this project');
	}

	return access;
}

export function requireProjectManageable(
	db: Database.Database,
	projectId: string,
	user: PublicUser
): ProjectAccess {
	const access = requireProjectManager(db, projectId, user);

	if (!access.canManage) {
		error(403, 'Archived projects are read-only. Unarchive the project first.');
	}

	return access;
}

export function requireProjectAdmin(
	db: Database.Database,
	projectId: string,
	user: PublicUser
): ProjectAccess {
	const access = requireProjectAccess(db, projectId, user);

	if (!access.isAdmin) {
		error(403, 'Only admins can perform this action');
	}

	return access;
}
