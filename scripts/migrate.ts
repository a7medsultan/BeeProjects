import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeDb, configureDb, getDb } from '../src/lib/server/db/index.ts';
import { applyMigrations } from '../src/lib/server/db/migrate-shared.ts';

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
	const applied = applyMigrations(getDb(), migrations);
	console.log(
		applied.length > 0 ? `Applied migrations: ${applied.join(', ')}` : 'No pending migrations.'
	);
} finally {
	closeDb();
}
