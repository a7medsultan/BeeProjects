import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id is the default algorithm in @node-rs/argon2.
 * Passwords must already be validated by the caller (length, etc.).
 */
export function hashPassword(password: string): Promise<string> {
	return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
	try {
		return await verify(passwordHash, password);
	} catch {
		return false;
	}
}
