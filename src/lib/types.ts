export type RoleName = 'admin' | 'project_manager' | 'member';

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
