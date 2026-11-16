export type RoleName = 'admin' | 'project_manager' | 'member';

export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Archived';
export type ProjectPriority = 'Low' | 'Medium' | 'High';

export interface PublicUser {
	id: string;
	name: string;
	email: string;
	role: RoleName;
	timezone: string;
	mustChangePassword: boolean;
}

export interface SessionInfo {
	expiresAt: string;
}

export interface MutationResult {
	ok: boolean;
	message?: string;
}

export interface ProjectSummary {
	id: string;
	name: string;
	description: string;
	ownerId: string;
	ownerName: string;
	startDate: string | null;
	dueDate: string | null;
	priority: ProjectPriority;
	status: ProjectStatus;
	createdAt: string;
	updatedAt: string;
	memberCount: number;
	totalTasks: number;
	completedTasks: number;
	overdueTasks: number;
	progress: number;
}

export interface ProjectMember {
	userId: string;
	name: string;
	email: string;
	role: RoleName;
	isActive: boolean;
	isOwner: boolean;
	openTasks: number;
	addedAt: string;
}

export interface ProjectPermissions {
	isAdmin: boolean;
	isOwner: boolean;
	isMember: boolean;
	isManager: boolean;
	isArchived: boolean;
	canManage: boolean;
	canArchive: boolean;
	canUnarchive: boolean;
	canReassignOwner: boolean;
	canAddMembers: boolean;
	canRemoveMembers: boolean;
}

export interface ProjectOwnerOption {
	id: string;
	name: string;
}

export interface MemberCandidate {
	id: string;
	name: string;
	email: string;
	role: RoleName;
}

export interface ActivityItem {
	id: string;
	actorId: string;
	actorName: string;
	action: string;
	field: string | null;
	oldValue: string | null;
	newValue: string | null;
	metadata: string | null;
	createdAt: string;
}
