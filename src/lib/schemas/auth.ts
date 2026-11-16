import { z } from 'zod';

export const loginSchema = z.object({
	email: z.email('Enter a valid email address').max(254),
	_password: z.string().min(1, 'Password is required').max(128),
	redirectTo: z.string().max(2048).optional().default('')
});

export const profileSchema = z.object({
	name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
	timezone: z.string().trim().min(1, 'Select a timezone').max(64)
});

export const changePasswordSchema = z
	.object({
		_currentPassword: z.string().min(1, 'Current password is required').max(128),
		_newPassword: z.string().min(10, 'Use at least 10 characters').max(128),
		_confirmPassword: z.string().min(1, 'Confirm your new password').max(128)
	})
	.refine((data) => data._newPassword === data._confirmPassword, {
		message: 'Passwords do not match',
		path: ['_confirmPassword']
	})
	.refine((data) => data._newPassword !== data._currentPassword, {
		message: 'Choose a password different from the current one',
		path: ['_newPassword']
	});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
