import { z } from 'zod';

export const roleSchema = z.enum(['admin', 'project_manager', 'member']);

export const createUserSchema = z.object({
	name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
	email: z.email('Enter a valid email address').max(254),
	role: roleSchema,
	timezone: z.string().trim().min(1, 'Select a timezone').max(64)
});

export const updateUserSchema = createUserSchema;

export const userListQuerySchema = z.object({
	q: z.string().trim().max(100).optional().default(''),
	role: z.enum(['all', 'admin', 'project_manager', 'member']).optional().default('all'),
	status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(5).max(100).default(20)
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
