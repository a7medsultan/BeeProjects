import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { applyMigrations } from '../../src/lib/server/db/migrate-shared.ts';
import {
	countActiveAdmins,
	createUser,
	getUserByEmail,
	getUserById,
	listUsers,
	resetUserPassword,
	setUserActive,
	updateUser,
	UserEmailConflictError
} from '../../src/lib/server/services/users.ts';

const initialSchema = readFileSync(
	new URL('../../src/lib/server/db/migrations/001_init.sql', import.meta.url),
	'utf8'
);

function makeDb(): Database.Database {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	applyMigrations(db, [{ version: '001_init', sql: initialSchema }]);
	return db;
}

const baseFilters = {
	q: '',
	role: 'all' as const,
	status: 'all' as const,
	page: 1,
	pageSize: 20
};

describe('user service', () => {
	it('creates a user with a temporary password and normalized email', async () => {
		const db = makeDb();

		const created = await createUser(db, {
			name: 'System Admin',
			email: 'ADMIN@Example.com',
			role: 'admin',
			timezone: 'UTC'
		});

		expect(created.email).toBe('admin@example.com');
		expect(created.tempPassword.length).toBeGreaterThanOrEqual(10);

		const stored = getUserByEmail(db, 'admin@example.com');
		expect(stored?.role).toBe('admin');
		expect(stored?.mustChangePassword).toBe(true);
		expect(stored?.isActive).toBe(true);
		expect(countActiveAdmins(db)).toBe(1);

		db.close();
	});

	it('rejects duplicate email addresses', async () => {
		const db = makeDb();

		await createUser(db, {
			name: 'Member One',
			email: 'member@example.com',
			role: 'member',
			timezone: 'UTC'
		});

		await expect(
			createUser(db, {
				name: 'Member Two',
				email: 'MEMBER@example.com',
				role: 'member',
				timezone: 'UTC'
			})
		).rejects.toBeInstanceOf(UserEmailConflictError);

		db.close();
	});

	it('filters and paginates users by role and status', async () => {
		const db = makeDb();

		await createUser(db, {
			name: 'Admin',
			email: 'admin@example.com',
			role: 'admin',
			timezone: 'UTC'
		});
		await createUser(db, {
			name: 'Manager',
			email: 'manager@example.com',
			role: 'project_manager',
			timezone: 'UTC'
		});
		await createUser(db, {
			name: 'Member One',
			email: 'one@example.com',
			role: 'member',
			timezone: 'UTC'
		});
		await createUser(db, {
			name: 'Member Two',
			email: 'two@example.com',
			role: 'member',
			timezone: 'UTC'
		});

		const members = listUsers(db, { ...baseFilters, role: 'member' });
		expect(members.total).toBe(2);
		expect(members.users).toHaveLength(2);

		const firstPage = listUsers(db, { ...baseFilters, role: 'member', pageSize: 1 });
		expect(firstPage.users).toHaveLength(1);
		expect(firstPage.totalPages).toBe(2);

		const search = listUsers(db, { ...baseFilters, q: 'two' });
		expect(search.total).toBe(1);
		expect(search.users[0]?.email).toBe('two@example.com');

		db.close();
	});

	it('updates user details and rejects conflicting emails', async () => {
		const db = makeDb();

		await createUser(db, {
			name: 'First',
			email: 'first@example.com',
			role: 'member',
			timezone: 'UTC'
		});
		const second = await createUser(db, {
			name: 'Second',
			email: 'second@example.com',
			role: 'member',
			timezone: 'UTC'
		});

		updateUser(db, second.id, {
			name: 'Second Updated',
			email: 'second-updated@example.com',
			role: 'project_manager',
			timezone: 'Europe/London'
		});

		const updated = getUserById(db, second.id);
		expect(updated?.name).toBe('Second Updated');
		expect(updated?.role).toBe('project_manager');
		expect(updated?.timezone).toBe('Europe/London');

		expect(() =>
			updateUser(db, second.id, {
				name: 'Second Updated',
				email: 'first@example.com',
				role: 'project_manager',
				timezone: 'Europe/London'
			})
		).toThrow(UserEmailConflictError);

		db.close();
	});

	it('deactivates and reactivates users', async () => {
		const db = makeDb();

		const created = await createUser(db, {
			name: 'Member',
			email: 'member@example.com',
			role: 'member',
			timezone: 'UTC'
		});

		setUserActive(db, created.id, false);
		expect(getUserById(db, created.id)?.isActive).toBe(false);

		setUserActive(db, created.id, true);
		expect(getUserById(db, created.id)?.isActive).toBe(true);

		db.close();
	});

	it('resets a password and forces a change at next sign-in', async () => {
		const db = makeDb();

		const created = await createUser(db, {
			name: 'Member',
			email: 'member@example.com',
			role: 'member',
			timezone: 'UTC'
		});

		const tempPassword = await resetUserPassword(db, created.id);
		expect(tempPassword.length).toBeGreaterThanOrEqual(10);
		expect(getUserByEmail(db, 'member@example.com')?.mustChangePassword).toBe(true);

		db.close();
	});
});
