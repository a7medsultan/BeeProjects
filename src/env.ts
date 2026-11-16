import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

/**
 * SvelteKit 3 environment variable definitions.
 * Private values are imported from `$app/env/private`.
 */
export const variables = defineEnvVars({
	DATABASE_PATH: {
		description: 'Path to the SQLite database file',
		schema: z.string().min(1).default('./data/app.db')
	},
	UPLOAD_DIR: {
		description: 'Directory where task attachments are stored',
		schema: z.string().min(1).default('./storage/attachments')
	},
	SESSION_TTL_DAYS: {
		description: 'Session lifetime in days',
		schema: (value) => {
			const parsed = Number(value ?? 30);
			if (!Number.isInteger(parsed) || parsed <= 0) {
				throw new Error('SESSION_TTL_DAYS must be a positive integer');
			}
			return parsed;
		}
	},
	JOBS_ENABLED: {
		description: 'Enable in-process background jobs',
		schema: z
			.string()
			.optional()
			.transform((value) => value !== 'false')
	}
});
