import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { closeDb, configureDb, getDb } from '../src/lib/server/db/index.ts';
import { applyMigrations } from '../src/lib/server/db/migrate-shared.ts';
import { seedAdmin } from '../src/lib/server/db/seed.ts';

const databasePath = process.env.DATABASE_PATH ?? './data/e2e.db';
const uploadDir = process.env.UPLOAD_DIR ?? './storage/e2e-attachments';
const migrationsDir = join(process.cwd(), 'src/lib/server/db/migrations');
const migrations = readdirSync(migrationsDir)
	.filter((file) => file.endsWith('.sql'))
	.sort()
	.map((file) => ({
		version: file.replace(/\.sql$/, ''),
		sql: readFileSync(join(migrationsDir, file), 'utf8')
	}));

for (const suffix of ['', '-wal', '-shm']) {
	rmSync(`${databasePath}${suffix}`, { force: true });
}

rmSync(uploadDir, { recursive: true, force: true });

try {
	configureDb(databasePath);
	applyMigrations(getDb(), migrations);

	await seedAdmin(getDb(), {
		name: process.env.ADMIN_NAME ?? 'E2E Admin',
		email: process.env.ADMIN_EMAIL ?? 'e2e-admin@example.com',
		password: process.env.ADMIN_PASSWORD ?? 'e2e-password-123'
	});

	console.log(`E2E database prepared at ${databasePath}`);
} finally {
	closeDb();
}
