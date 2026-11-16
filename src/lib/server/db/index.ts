import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

let db: Database.Database | null = null;
let configuredPath: string | null = null;

/**
 * Opens the SQLite database and applies the required connection pragmas.
 * Call once from the server init hook (or from a CLI script).
 */
export function configureDb(path: string): Database.Database {
	if (db) {
		if (configuredPath === path) return db;
		throw new Error(`Database already configured for "${configuredPath}"`);
	}

	if (path !== ':memory:') {
		const absolutePath = isAbsolute(path) ? path : resolve(process.cwd(), path);
		mkdirSync(dirname(absolutePath), { recursive: true });
		db = new Database(absolutePath);
	} else {
		db = new Database(':memory:');
	}

	db.pragma('foreign_keys = ON');
	db.pragma('busy_timeout = 5000');

	if (path !== ':memory:') {
		db.pragma('journal_mode = WAL');
		db.pragma('synchronous = NORMAL');
	}

	configuredPath = path;
	return db;
}

export function getDb(): Database.Database {
	if (!db) {
		throw new Error('Database is not configured. Call configureDb() first.');
	}
	return db;
}

export function closeDb(): void {
	if (!db) return;
	db.close();
	db = null;
	configuredPath = null;
}
