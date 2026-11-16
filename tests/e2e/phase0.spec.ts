import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = 'e2e-admin@example.com';
const ADMIN_PASSWORD = 'e2e-password-123';

test('Phase 0 happy path: admin setup, member work, permissions', async ({ page }) => {
	test.setTimeout(120_000);

	// Admin login
	await page.goto('/login');
	await page.getByLabel('Email').fill(ADMIN_EMAIL);
	await page.getByLabel('Password').fill(ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();

	// Create a project
	await page.goto('/projects/new');
	await page.getByLabel('Project name').fill('E2E Project');
	await page.getByLabel('Description').fill('End-to-end test project');
	await page.getByLabel('Priority').selectOption('High');
	await page.getByLabel('Status').selectOption('Active');
	await page.getByRole('button', { name: 'Create project' }).click();
	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);
	const projectUrl = page.url();
	await expect(page.getByRole('heading', { name: 'E2E Project' })).toBeVisible();

	// Create a member user and capture the temporary password
	await page.goto('/admin/users/new');
	await page.getByLabel('Name').fill('E2E Member');
	await page.getByLabel('Email').fill('e2e-member@example.com');
	await page.getByLabel('Role').selectOption('member');
	await page.getByRole('button', { name: 'Create user' }).click();
	await expect(page.getByText('Created e2e-member@example.com')).toBeVisible();
	const tempPassword = (await page.locator('code').first().innerText()).trim();
	expect(tempPassword.length).toBeGreaterThanOrEqual(10);

	// Add the member to the project
	await page.goto(`${projectUrl}/members`);
	await page.getByLabel('User').selectOption({
		label: 'E2E Member · e2e-member@example.com'
	});
	await page.getByRole('button', { name: 'Add member' }).click();
	await expect(page.locator('table')).toContainText('E2E Member');

	// Create a task assigned to the member
	await page.goto(`${projectUrl}/tasks/new`);
	await page.getByLabel('Title').fill('E2E Task');
	await page.getByLabel('Description').fill('Task for the end-to-end flow');
	await page.getByLabel('Priority').selectOption('High');
	await page.getByLabel('Status').selectOption('In Progress');
	await page.getByRole('checkbox', { name: 'E2E Member' }).check();
	await page.getByRole('button', { name: 'Create task' }).click();
	await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]+$/);
	const taskUrl = page.url();
	await expect(page.getByRole('heading', { name: 'E2E Task' })).toBeVisible();

	// Comment and attach a file as admin
	await page.getByLabel('Comment').fill('Admin comment');
	await page.getByRole('button', { name: 'Comment', exact: true }).click();
	await expect(page.getByText('Admin comment', { exact: true })).toBeVisible();

	await page.locator('#attachment-file').setInputFiles({
		name: 'e2e.txt',
		mimeType: 'text/plain',
		buffer: Buffer.from('E2E attachment')
	});
	await page.getByRole('button', { name: 'Upload', exact: true }).click();
	await expect(page.getByRole('link', { name: 'e2e.txt' })).toBeVisible();

	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('link', { name: 'e2e.txt' }).click();
	const download = await downloadPromise;
	expect(download.suggestedFilename()).toBe('e2e.txt');

	// Sign out as admin
	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page).toHaveURL(/\/login/);

	// Member signs in with the temporary password and must change it
	await page.getByLabel('Email').fill('e2e-member@example.com');
	await page.getByLabel('Password').fill(tempPassword);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/profile\?force=1/);

	await page.getByLabel('Current password').fill(tempPassword);
	await page.getByLabel('New password').fill('e2e-member-new-password');
	await page.getByLabel('Confirm password').fill('e2e-member-new-password');
	await page.getByRole('button', { name: 'Update password' }).click();
	await expect(page.getByText(/Password changed/)).toBeVisible();

	// My Tasks includes the assigned task
	await page.goto('/my-tasks');
	await expect(page.getByText('E2E Task').first()).toBeVisible();

	// Assignment notification is present; opening it marks it read
	await page.goto('/notifications');
	await expect(page.getByText(/assigned you a task/).first()).toBeVisible();
	await page
		.getByText(/assigned you a task/)
		.first()
		.click();
	await expect(page).toHaveURL(new RegExp(taskUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

	// The admin comment also created a notification; mark everything read.
	await page.goto('/notifications');
	await page.getByRole('button', { name: 'Mark all read' }).click();
	await expect(page.getByText('All notifications marked as read.')).toBeVisible();

	const unreadResponse = await page.request.get('/api/notifications/unread-count');
	expect(unreadResponse.ok()).toBe(true);
	expect(await unreadResponse.json()).toEqual({ count: 0 });

	// Kanban status fallback for a member-assignee
	await page.goto(`${projectUrl}/board`);
	await page.getByRole('heading', { name: 'Kanban board' }).waitFor();
	// Give Svelte hydration time to attach the select handler in dev mode.
	await page.waitForTimeout(750);
	const card = page.locator('li', { hasText: 'E2E Task' }).first();
	await card.locator('select').selectOption('Done');
	await expect(page.locator('li', { hasText: 'E2E Task' }).first().locator('select')).toHaveValue(
		'Done'
	);
	await page.reload();
	await expect(page.locator('li', { hasText: 'E2E Task' }).first().locator('select')).toHaveValue(
		'Done'
	);

	// Permissions: member cannot reach admin users or create projects/tasks
	const adminResponse = await page.goto('/admin/users');
	expect(adminResponse?.status()).toBe(403);

	const projectResponse = await page.goto('/projects/new');
	expect(projectResponse?.status()).toBe(403);

	const taskResponse = await page.goto(`${projectUrl}/tasks/new`);
	expect(taskResponse?.status()).toBe(403);
});
