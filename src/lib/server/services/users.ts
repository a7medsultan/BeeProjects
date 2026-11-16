import { randomUUID, randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { PublicUser, RoleName } from '#lib/types.ts';
import type { UserListQuery } from '#lib/schemas/users.ts';
import { hashPassword } from '../auth/password.ts';

export interface AuthUser {
	id: string;
	name: string;
	email: string;
	passwordHash: string;
	role: RoleName;
	timezone: string;
	isActive: boolean;
	mustChangePassword: boolean;
}

export interface AdminUser {
	id: string;
	name: string;
	email: string;
	role: RoleName;
	timezone: string;
	isActive: boolean;
	mustChangePassword: boolean;
	lastLoginAt: string | null;
	createdAt: string;
	ownedProjects: number;
}

export interface UserListResult {
	users: AdminUser[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface CreateUserServiceInput {
	name: string;
	email: string;
	role: RoleName;
	timezone: string;
}

export interface UpdateUserServiceInput {
	name: string;
	email: string;
	role: RoleName;
	timezone: string;
}

interface AuthUserRow {
	id: string;
	name: string;
	email: string;
	password_hash: string;
	role: string;
	timezone: string;
	is_active: number;
	must_change_password: number;
}

interface AdminUserRow {
	id: string;
	name: string;
	email: string;
	role: string;
	timezone: string;
	is_active: number;
	must_change_password: number;
	last_login_at: string | null;
	created_at: string;
	owned_projects: number;
}

const ADMIN_USER_SELECT = `
	SELECT u.id, u.name, u.email, r.name AS role, u.timezone,
	       u.is_active, u.must_change_password, u.last_login_at, u.created_at,
	       (SELECT COUNT(*) FROM projects p
	        WHERE p.owner_id = u.id AND p.status <> 'Archived') AS owned_projects
	FROM users u
	JOIN roles r ON r.id = u.role_id
`;

export class UserEmailConflictError extends Error {
	constructor() {
		super('A user with this email address already exists.');
		this.name = 'UserEmailConflictError';
	}
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function mapAuthUser(row: AuthUserRow): AuthUser {
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		passwordHash: row.password_hash,
		role: row.role as RoleName,
		timezone: row.timezone,
		isActive: row.is_active === 1,
		mustChangePassword: row.must_change_password === 1
	};
}

function mapAdminUser(row: AdminUserRow): AdminUser {
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		role: row.role as RoleName,
		timezone: row.timezone,
		isActive: row.is_active === 1,
		mustChangePassword: row.must_change_password === 1,
		lastLoginAt: row.last_login_at,
		createdAt: row.created_at,
		ownedProjects: row.owned_projects
	};
}

export function toPublicUser(user: AuthUser): PublicUser {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		timezone: user.timezone,
		mustChangePassword: user.mustChangePassword
	};
}

export function getUserByEmail(db: Database.Database, email: string): AuthUser | null {
	const row = db
		.prepare(
			`SELECT u.id, u.name, u.email, u.password_hash, r.name AS role,
			        u.timezone, u.is_active, u.must_change_password
			 FROM users u
			 JOIN roles r ON r.id = u.role_id
			 WHERE u.email = ?`
		)
		.get(normalizeEmail(email)) as AuthUserRow | undefined;

	return row ? mapAuthUser(row) : null;
}

export function getUserById(db: Database.Database, id: string): AdminUser | null {
	const row = db.prepare(`${ADMIN_USER_SELECT} WHERE u.id = ?`).get(id) as AdminUserRow | undefined;

	return row ? mapAdminUser(row) : null;
}

export function listUsers(db: Database.Database, filters: UserListQuery): UserListResult {
	const conditions: string[] = [];
	const params: Record<string, string | number> = {};

	if (filters.q) {
		conditions.push('(u.name LIKE @q OR u.email LIKE @q)');
		params.q = `%${filters.q}%`;
	}

	if (filters.role !== 'all') {
		conditions.push('r.name = @role');
		params.role = filters.role;
	}

	if (filters.status !== 'all') {
		conditions.push('u.is_active = @active');
		params.active = filters.status === 'active' ? 1 : 0;
	}

	const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

	const countStatement = db.prepare(
		`SELECT COUNT(*) AS count FROM users u JOIN roles r ON r.id = u.role_id ${where}`
	);
	const countRow =
		Object.keys(params).length > 0
			? (countStatement.get(params) as { count: number })
			: (countStatement.get() as { count: number });

	const offset = (filters.page - 1) * filters.pageSize;
	const rows = db
		.prepare(
			`${ADMIN_USER_SELECT} ${where}
			 ORDER BY u.is_active DESC, u.name COLLATE NOCASE ASC
			 LIMIT @limit OFFSET @offset`
		)
		.all({ ...params, limit: filters.pageSize, offset }) as AdminUserRow[];

	const total = countRow.count;

	return {
		users: rows.map(mapAdminUser),
		total,
		page: filters.page,
		pageSize: filters.pageSize,
		totalPages: Math.max(1, Math.ceil(total / filters.pageSize))
	};
}

export function getRoleId(db: Database.Database, role: RoleName): number {
	const row = db.prepare('SELECT id FROM roles WHERE name = ?').get(role) as
		{ id: number } | undefined;

	if (!row) throw new Error(`Unknown role: ${role}`);
	return row.id;
}

export function generateTempPassword(): string {
	return randomBytes(12).toString('base64url').slice(0, 16);
}

export async function createUser(
	db: Database.Database,
	input: CreateUserServiceInput
): Promise<{ id: string; email: string; tempPassword: string }> {
	const email = normalizeEmail(input.email);
	const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

	if (existing) throw new UserEmailConflictError();

	const roleId = getRoleId(db, input.role);
	const tempPassword = generateTempPassword();
	const passwordHash = await hashPassword(tempPassword);
	const id = randomUUID();
	const now = new Date().toISOString();

	db.prepare(
		`INSERT INTO users
		 (id, name, email, password_hash, role_id, timezone, is_active, must_change_password, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`
	).run(id, input.name.trim(), email, passwordHash, roleId, input.timezone, now, now);

	return { id, email, tempPassword };
}

export function updateUser(db: Database.Database, id: string, input: UpdateUserServiceInput): void {
	const email = normalizeEmail(input.email);
	const conflict = db.prepare('SELECT id FROM users WHERE email = ? AND id <> ?').get(email, id);

	if (conflict) throw new UserEmailConflictError();

	const roleId = getRoleId(db, input.role);
	const result = db
		.prepare(
			`UPDATE users
			 SET name = ?, email = ?, role_id = ?, timezone = ?, updated_at = ?
			 WHERE id = ?`
		)
		.run(input.name.trim(), email, roleId, input.timezone, new Date().toISOString(), id);

	if (result.changes === 0) throw new Error('User not found');
}

export function setUserActive(db: Database.Database, id: string, active: boolean): void {
	const result = db
		.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?')
		.run(active ? 1 : 0, new Date().toISOString(), id);

	if (result.changes === 0) throw new Error('User not found');
}

export async function resetUserPassword(db: Database.Database, id: string): Promise<string> {
	const tempPassword = generateTempPassword();
	const passwordHash = await hashPassword(tempPassword);

	db.prepare(
		`UPDATE users
		 SET password_hash = ?, must_change_password = 1, updated_at = ?
		 WHERE id = ?`
	).run(passwordHash, new Date().toISOString(), id);

	return tempPassword;
}

export async function changeOwnPassword(
	db: Database.Database,
	id: string,
	newPassword: string
): Promise<void> {
	const passwordHash = await hashPassword(newPassword);

	db.prepare(
		`UPDATE users
		 SET password_hash = ?, must_change_password = 0, updated_at = ?
		 WHERE id = ?`
	).run(passwordHash, new Date().toISOString(), id);
}

export function touchLastLogin(db: Database.Database, id: string): void {
	db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), id);
}

export function countActiveAdmins(db: Database.Database): number {
	const row = db
		.prepare(
			`SELECT COUNT(*) AS count
			 FROM users u
			 JOIN roles r ON r.id = u.role_id
			 WHERE r.name = 'admin' AND u.is_active = 1`
		)
		.get() as { count: number };

	return row.count;
}

export function countOwnedActiveProjects(db: Database.Database, userId: string): number {
	const row = db
		.prepare(
			`SELECT COUNT(*) AS count
			 FROM projects
			 WHERE owner_id = ? AND status <> 'Archived'`
		)
		.get(userId) as { count: number };

	return row.count;
}
