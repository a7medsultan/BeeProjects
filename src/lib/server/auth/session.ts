import { createHash, randomBytes } from 'node:crypto';
import { dev } from '$app/env';
import type { Cookies } from '@sveltejs/kit';
import type Database from 'better-sqlite3';
import type { PublicUser, RoleName, SessionInfo } from '#lib/types.ts';
import type { Locale } from '#lib/i18n/locales.ts';

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_SECONDS = 24 * 60 * 60;

export const SESSION_COOKIE_NAME = 'sid';

interface SessionRow {
	expires_at: string;
	last_seen_at: string;
	id: string;
	name: string;
	email: string;
	role: string;
	timezone: string;
	locale: string | null;
	is_active: number;
	must_change_password: number;
}

export interface SessionContext {
	user: PublicUser;
	session: SessionInfo;
}

export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export function createSession(
	db: Database.Database,
	userId: string,
	ttlDays: number,
	meta: { ip?: string; userAgent?: string } = {}
): { token: string; expiresAt: string } {
	const token = randomBytes(32).toString('base64url');
	const now = new Date();
	const expiresAt = new Date(now.getTime() + ttlDays * 24 * ONE_HOUR_MS).toISOString();

	db.prepare(
		`INSERT INTO sessions (token_hash, user_id, expires_at, created_at, last_seen_at, ip, user_agent)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).run(
		hashToken(token),
		userId,
		expiresAt,
		now.toISOString(),
		now.toISOString(),
		meta.ip ?? null,
		meta.userAgent ?? null
	);

	return { token, expiresAt };
}

export function validateSession(db: Database.Database, token: string): SessionContext | null {
	const tokenHash = hashToken(token);
	const row = db
		.prepare(
			`SELECT s.expires_at, s.last_seen_at,
			        u.id, u.name, u.email, u.role_id, u.timezone, u.locale, u.is_active, u.must_change_password,
			        r.name AS role
			 FROM sessions s
			 JOIN users u ON u.id = s.user_id
			 JOIN roles r ON r.id = u.role_id
			 WHERE s.token_hash = ?`
		)
		.get(tokenHash) as SessionRow | undefined;

	if (!row) return null;

	const now = new Date();

	if (row.is_active !== 1 || new Date(row.expires_at) <= now) {
		db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
		return null;
	}

	if (now.getTime() - new Date(row.last_seen_at).getTime() > ONE_HOUR_MS) {
		db.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?').run(
			now.toISOString(),
			tokenHash
		);
	}

	return {
		user: {
			id: row.id,
			name: row.name,
			email: row.email,
			role: row.role as RoleName,
			timezone: row.timezone,
			locale: row.locale as Locale | null,
			mustChangePassword: row.must_change_password === 1
		},
		session: { expiresAt: row.expires_at }
	};
}

export function revokeSession(db: Database.Database, token: string): void {
	db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function revokeAllUserSessions(
	db: Database.Database,
	userId: string,
	exceptToken?: string
): void {
	if (exceptToken) {
		db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').run(
			userId,
			hashToken(exceptToken)
		);
		return;
	}
	db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function deleteExpiredSessions(db: Database.Database): void {
	db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
}

export function setSessionCookie(
	cookies: Cookies,
	token: string,
	expiresAt: string,
	ttlDays: number
): void {
	cookies.set(SESSION_COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		expires: new Date(expiresAt),
		maxAge: Math.max(1, Math.floor(ttlDays * ONE_DAY_SECONDS))
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

export function getSessionToken(cookies: Cookies): string | undefined {
	return cookies.get(SESSION_COOKIE_NAME);
}
