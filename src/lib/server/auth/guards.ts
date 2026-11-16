import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import type { PublicUser } from '#lib/types.ts';

export interface RequireUserOptions {
	/**
	 * Profile actions must remain reachable while a temporary password is
	 * pending; everything else is locked until the password is changed.
	 */
	allowPendingPassword?: boolean;
}

export function requireUser(event: RequestEvent, options: RequireUserOptions = {}): PublicUser {
	if (!event.locals.user) {
		redirect(303, '/login');
	}

	if (event.locals.user.mustChangePassword && !options.allowPendingPassword) {
		redirect(303, '/profile?force=1');
	}

	return event.locals.user;
}

export function requireAdmin(event: RequestEvent): PublicUser {
	const user = requireUser(event);

	if (user.role !== 'admin') {
		error(403, 'Admin access required');
	}

	return user;
}
