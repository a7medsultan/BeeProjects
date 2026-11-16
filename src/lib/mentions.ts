const MENTION_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g;

export interface MentionSegment {
	type: 'text' | 'mention';
	text: string;
	userId?: string;
}

export function parseMentions(body: string): MentionSegment[] {
	const segments: MentionSegment[] = [];
	let lastIndex = 0;

	for (const match of body.matchAll(MENTION_PATTERN)) {
		const index = match.index ?? 0;

		if (index > lastIndex) {
			segments.push({ type: 'text', text: body.slice(lastIndex, index) });
		}

		segments.push({
			type: 'mention',
			text: match[1] ?? '',
			userId: match[2]
		});

		lastIndex = index + match[0].length;
	}

	if (lastIndex < body.length) {
		segments.push({ type: 'text', text: body.slice(lastIndex) });
	}

	return segments;
}

export function extractMentionIds(body: string): string[] {
	const ids = new Set<string>();

	for (const match of body.matchAll(MENTION_PATTERN)) {
		const id = match[2];
		if (id) ids.add(id);
	}

	return [...ids];
}

export function mentionQueryAt(textBeforeCursor: string): { query: string; start: number } | null {
	const match = textBeforeCursor.match(/(?:^|\s)@([\p{L}\p{N}._-]*)$/u);

	if (!match) return null;

	return {
		query: match[1] ?? '',
		start: textBeforeCursor.lastIndexOf('@')
	};
}

export function buildMentionToken(name: string, userId: string): string {
	return `@[${name}](${userId}) `;
}
