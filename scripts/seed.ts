import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeDb, configureDb, getDb } from '../src/lib/server/db/index.ts';
import { applyMigrations } from '../src/lib/server/db/migrate-shared.ts';
import { seedAdmin } from '../src/lib/server/db/seed.ts';

const migrationsDir = join(process.cwd(), 'src/lib/server/db/migrations');

const migrations = readdirSync(migrationsDir)
	.filter((file) => file.endsWith('.sql'))
	.sort()
	.map((file) => ({
		version: file.replace(/\.sql$/, ''),
		sql: readFileSync(join(migrationsDir, file), 'utf8')
	}));

try {
	configureDb(process.env.DATABASE_PATH ?? './data/app.db');
	applyMigrations(getDb(), migrations);

	const result = await seedAdmin(getDb(), {
		name: process.env.ADMIN_NAME ?? 'System Admin',
		email: process.env.ADMIN_EMAIL ?? '',
		password: process.env.ADMIN_PASSWORD ?? ''
	});

	if (result.created) {
		console.log(`Created first admin: ${result.email}`);
	} else {
		console.log('Users already exist; first admin was not created.');
	}
} finally {
	closeDb();
}
