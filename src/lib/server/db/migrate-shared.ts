import type Database from 'better-sqlite3';

export interface Migration {
	version: string;
	sql: string;
}

/**
 * Applies pending migrations in a transaction and records them in
 * schema_migrations. Returns the versions that were applied.
 */
export function applyMigrations(db: Database.Database, migrations: Migration[]): string[] {
	db.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL
		) STRICT;
	`);

	const applied = new Set(
		(db.prepare('SELECT version FROM schema_migrations').all() as { version: string }[]).map(
			(row) => row.version
		)
	);

	const record = db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)');

	const appliedNow: string[] = [];

	for (const migration of [...migrations].sort((a, b) => a.version.localeCompare(b.version))) {
		if (applied.has(migration.version)) continue;

		db.transaction(() => {
			db.exec(migration.sql);
			record.run(migration.version, new Date().toISOString());
		})();

		appliedNow.push(migration.version);
	}

	return appliedNow;
}
