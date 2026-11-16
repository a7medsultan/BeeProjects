import { describe, expect, it } from 'vitest';
import {
	buildMentionToken,
	extractMentionIds,
	mentionQueryAt,
	parseMentions
} from '../../src/lib/mentions.ts';

describe('mention parsing', () => {
	it('parses mention tokens and surrounding text', () => {
		const body = 'Hello @[Ada Lovelace](user-1), please review this.';

		expect(parseMentions(body)).toEqual([
			{ type: 'text', text: 'Hello ' },
			{ type: 'mention', text: 'Ada Lovelace', userId: 'user-1' },
			{ type: 'text', text: ', please review this.' }
		]);
	});

	it('extracts unique mentioned user IDs', () => {
		expect(extractMentionIds('@[A](user-1) and @[B](user-2) and again @[A](user-1)')).toEqual([
			'user-1',
			'user-2'
		]);
	});

	it('detects an @ query at the cursor', () => {
		expect(mentionQueryAt('Hello @ad')).toEqual({ query: 'ad', start: 6 });
		expect(mentionQueryAt('Hello ad')).toBeNull();
		expect(mentionQueryAt('email@example')).toBeNull();
	});

	it('builds a stable mention token', () => {
		expect(buildMentionToken('Ada Lovelace', 'user-1')).toBe('@[Ada Lovelace](user-1) ');
	});
});
