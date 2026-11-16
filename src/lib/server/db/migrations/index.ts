/// <reference types="vite/client" />

/**
 * Migrations are bundled at build time so adapter-node deployments do not
 * need the raw .sql files on disk.
 */
const files = import.meta.glob('./*.sql', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export const migrations = Object.entries(files)
	.map(([path, sql]) => ({
		version: path.replace(/^\.\//, '').replace(/\.sql$/, ''),
		sql
	}))
	.sort((a, b) => a.version.localeCompare(b.version));
