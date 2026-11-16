import type { PublicUser, SessionInfo } from '#lib/types.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Error {
			message: string;
		}

		interface Locals {
			user: PublicUser | null;
			session: SessionInfo | null;
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
