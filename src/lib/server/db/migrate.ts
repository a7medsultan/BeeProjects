import type Database from 'better-sqlite3';
import { applyMigrations } from './migrate-shared.ts';
import { migrations } from './migrations/index.ts';

export function migrate(db: Database.Database): string[] {
	return applyMigrations(db, migrations);
}
