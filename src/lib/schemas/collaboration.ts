import { z } from 'zod';

export const commentSchema = z.object({
	body: z
		.string()
		.trim()
		.min(1, 'Comment cannot be empty')
		.max(5000, 'Comment is too long (maximum 5000 characters)')
});

export type CommentInput = z.infer<typeof commentSchema>;
