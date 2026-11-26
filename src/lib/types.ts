import type { Locale } from './i18n/locales.ts';

export type RoleName = 'admin' | 'project_manager' | 'member';

export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Archived';
export type ProjectPriority = 'Low' | 'Medium' | 'High';

export interface PublicUser {
	id: string;
	name: string;
	email: string;
	role: RoleName;
	timezone: string;
	locale: Locale | null;
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

export type TaskStatus = 'Backlog' | 'To Do' | 'In Progress' | 'Review' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface TaskAssignee {
	userId: string;
	name: string;
	email: string;
	isActive: boolean;
}

export interface TaskListItem {
	id: string;
	projectId: string;
	projectName: string;
	parentTaskId: string | null;
	parentTitle: string | null;
	title: string;
	description: string;
	priority: TaskPriority;
	status: TaskStatus;
	startDate: string | null;
	dueDate: string | null;
	completedAt: string | null;
	createdById: string;
	createdByName: string;
	createdAt: string;
	updatedAt: string;
	assignees: TaskAssignee[];
	subtaskCount: number;
	completedSubtaskCount: number;
	isOverdue: boolean;
}

export interface TaskPermissions {
	canEdit: boolean;
	canManageAssignees: boolean;
	canDelete: boolean;
	canCreateSubtask: boolean;
	isAssignee: boolean;
}

export interface DashboardStats {
	activeProjects: number;
	openTasks: number;
	completedTasks: number;
	overdueTasks: number;
	dueToday: number;
}

export interface DashboardMyWork {
	assigned: TaskListItem[];
	overdue: TaskListItem[];
	upcoming: TaskListItem[];
	recentlyUpdated: TaskListItem[];
	assignedCount: number;
	overdueCount: number;
	upcomingCount: number;
}

export interface DashboardData {
	stats: DashboardStats;
	myWork: DashboardMyWork;
	projects: ProjectSummary[];
	projectTotal: number;
}

export interface CommentItem {
	id: string;
	taskId: string;
	authorId: string;
	authorName: string;
	authorRole: RoleName;
	body: string;
	createdAt: string;
	updatedAt: string;
	isEdited: boolean;
}

export interface AttachmentItem {
	id: string;
	taskId: string;
	fileName: string;
	mimeType: string;
	sizeBytes: number;
	uploadedById: string;
	uploadedByName: string;
	createdAt: string;
}

export type NotificationType =
	'task_assigned' | 'task_reassigned' | 'comment_added' | 'mention' | 'due_soon' | 'overdue';

export interface NotificationPayload {
	variant?: 'assigned' | 'reassigned' | 'unassigned';
	actorName?: string;
	taskTitle?: string;
	projectName?: string;
	excerpt?: string;
}

export interface NotificationItem {
	id: string;
	type: NotificationType;
	title: string;
	body: string | null;
	projectId: string | null;
	taskId: string | null;
	commentId: string | null;
	actorName: string | null;
	payload: NotificationPayload | null;
	isRead: boolean;
	createdAt: string;
}
