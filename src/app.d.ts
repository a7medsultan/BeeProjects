import type { PublicUser, SessionInfo } from '#lib/types.ts';
import type { Direction, Locale } from '#lib/i18n/locales.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}

		interface Locals {
			user: PublicUser | null;
			session: SessionInfo | null;
			locale: Locale;
			dir: Direction;
		}

		namespace Superforms {
			type Message = {
				type: 'success' | 'error' | 'warning';
				text: string;
				tempPassword?: string;
			};
		}
	}
}

export {};
