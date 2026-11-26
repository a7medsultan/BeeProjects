import { DATABASE_PATH, JOBS_ENABLED } from '$app/env/private';
import { building } from '$app/env';
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { closeDb, configureDb, getDb } from '#lib/server/db/index.ts';
import { migrate } from '#lib/server/db/migrate.ts';
import {
	SESSION_COOKIE_NAME,
	clearSessionCookie,
	validateSession
} from '#lib/server/auth/session.ts';
import { startJobs, stopJobs } from '#lib/server/jobs.ts';
import { LOCALE_COOKIE, dirFor, resolveLocale, type Locale } from '#lib/i18n/locales.ts';
import { localizeServerMessage, translate } from '#lib/i18n/index.ts';

export const init: ServerInit = async () => {
	if (building) return;

	configureDb(DATABASE_PATH);
	migrate(getDb());

	if (JOBS_ENABLED) {
		startJobs();
	}
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.session = null;

	if (!building) {
		const token = event.cookies.get(SESSION_COOKIE_NAME);

		if (token) {
			const context = validateSession(getDb(), token);

			if (context) {
				event.locals.user = context.user;
				event.locals.session = context.session;
			} else {
				clearSessionCookie(event.cookies);
			}
		}
	}

	const locale = resolveLocale({
		userLocale: event.locals.user?.locale,
		cookieLocale: event.cookies.get(LOCALE_COOKIE),
		acceptLanguage: event.request.headers.get('accept-language')
	});
	event.locals.locale = locale;
	event.locals.dir = dirFor(locale);

	const response = await resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('<html lang="en" dir="ltr">', `<html lang="${locale}" dir="${dirFor(locale)}">`)
	});
	return withSecurityHeaders(response);
};

function withSecurityHeaders(response: Response): Response {
	const headers = {
		'X-Content-Type-Options': 'nosniff',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
		'X-Frame-Options': 'DENY',
		'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
	} as const;

	try {
		for (const [name, value] of Object.entries(headers)) {
			response.headers.set(name, value);
		}
		return response;
	} catch {
		// Redirects and some framework responses can have immutable headers.
		const clonedHeaders = new Headers(response.headers);
		for (const [name, value] of Object.entries(headers)) {
			clonedHeaders.set(name, value);
		}
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: clonedHeaders
		});
	}
}

export const handleError: HandleServerError = ({ kind, error, event }) => {
	const locale: Locale = event.locals.locale ?? 'en';

	if (kind === 'unknown') {
		console.error(`[server error] ${event.request.method} ${event.url.pathname}`, error);
		return { message: translate(locale, 'error.server') };
	}

	if (kind === 'framework') {
		if (error.status >= 500) {
			console.error(`[framework error] ${event.request.method} ${event.url.pathname}`, error);
		}
		return { message: localizeServerMessage(locale, error.message) };
	}

	if (kind === 'app' || kind === 'validation') {
		return { message: localizeServerMessage(locale, error.message) };
	}

	return { message: translate(locale, 'error.server') };
};

const globalState = globalThis as typeof globalThis & {
	__beeprojectsShutdownRegistered?: boolean;
};

if (!globalState.__beeprojectsShutdownRegistered) {
	globalState.__beeprojectsShutdownRegistered = true;

	process.on('sveltekit:shutdown', () => {
		stopJobs();
		closeDb();
	});
}
