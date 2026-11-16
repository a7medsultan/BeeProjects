import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { hashPassword } from '../auth/password.ts';

export interface SeedAdminInput {
	name: string;
	email: string;
	password: string;
}

export type SeedAdminResult =
	{ created: true; id: string; email: string } | { created: false; reason: 'users-exist' };

/**
 * Creates the first admin only when the users table is empty.
 * Roles are seeded by the initial migration.
 */
export async function seedAdmin(
	db: Database.Database,
	input: SeedAdminInput
): Promise<SeedAdminResult> {
	const existing = db.prepare('SELECT COUNT(*) AS count FROM users').get() as {
		count: number;
	};

	if (existing.count > 0) {
		return { created: false, reason: 'users-exist' };
	}

	const role = db.prepare("SELECT id FROM roles WHERE name = 'admin'").get() as
		{ id: number } | undefined;

	if (!role) {
		throw new Error('Admin role is missing. Apply migrations first.');
	}

	const email = input.email.trim().toLowerCase();
	const name = input.name.trim() || 'System Admin';

	if (!email) throw new Error('ADMIN_EMAIL is required.');
	if (!input.password) throw new Error('ADMIN_PASSWORD is required.');
	if (input.password.length < 10) {
		throw new Error('ADMIN_PASSWORD must be at least 10 characters.');
	}

	const now = new Date().toISOString();
	const id = randomUUID();
	const passwordHash = await hashPassword(input.password);

	db.prepare(
		`INSERT INTO users
		 (id, name, email, password_hash, role_id, timezone, is_active, must_change_password, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, 'UTC', 1, 0, ?, ?)`
	).run(id, name, email, passwordHash, role.id, now, now);

	return { created: true, id, email };
}
