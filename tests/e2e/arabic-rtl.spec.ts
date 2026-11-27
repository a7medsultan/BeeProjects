import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = 'e2e-admin@example.com';
const ADMIN_PASSWORD = 'e2e-password-123';

test('Arabic locale and RTL layout across core screens', async ({ page }) => {
	test.setTimeout(120_000);

	await page.goto('/login');
	await page.getByRole('button', { name: 'العربية' }).click();

	await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
	await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
	await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible();

	// Server-side Zod validation is localized too
	await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
	await expect(page.getByText('أدخل بريدًا إلكترونيًا صالحًا')).toBeVisible();

	await page.getByLabel('البريد الإلكتروني').fill(ADMIN_EMAIL);
	await page.getByLabel('كلمة المرور').fill(ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { name: /مرحبًا بعودتك/ })).toBeVisible();
	await expect(page.locator('aside')).toHaveAttribute('aria-label', 'التنقل الرئيسي');

	const sidebarBox = await page.locator('aside').boundingBox();
	const mainBox = await page.locator('main').boundingBox();
	expect(sidebarBox).not.toBeNull();
	expect(mainBox).not.toBeNull();
	expect(sidebarBox!.x).toBeGreaterThan(mainBox!.x);

	// Projects list and create form
	await page.goto('/projects');
	await expect(page.getByRole('heading', { name: 'المشاريع' })).toBeVisible();
	await page.getByRole('link', { name: 'مشروع جديد' }).click();
	await expect(page.getByRole('heading', { name: 'مشروع جديد' })).toBeVisible();
	await page.getByLabel('اسم المشروع').fill('مشروع اختبار RTL');
	await page.getByLabel('الوصف').fill('مشروع لاختبار الواجهة العربية');
	await page.getByRole('button', { name: 'إنشاء مشروع' }).click();
	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);
	const projectUrl = page.url();
	await expect(page.getByRole('heading', { name: 'مشروع اختبار RTL' })).toBeVisible();

	// Project tabs render in Arabic without errors
	await page.goto(`${projectUrl}/list`);
	await expect(page.getByRole('heading', { name: 'المهام' })).toBeVisible();
	await page.goto(`${projectUrl}/board`);
	await expect(page.getByRole('heading', { name: 'لوحة كانبان' })).toBeVisible();
	await page.goto(`${projectUrl}/members`);
	await expect(page.getByRole('heading', { name: 'أعضاء المشروع' })).toBeVisible();
	await page.goto(`${projectUrl}/activity`);
	await expect(page.getByRole('heading', { name: 'نشاط المشروع' })).toBeVisible();

	// Admin, notifications, profile and my tasks
	await page.goto('/admin/users');
	await expect(page.getByRole('heading', { name: 'إدارة المستخدمين' })).toBeVisible();
	await page.goto('/notifications');
	await expect(page.getByRole('heading', { name: 'الإشعارات' })).toBeVisible();
	await page.goto('/my-tasks');
	await expect(page.getByRole('heading', { name: 'مهامي' })).toBeVisible();

	// Mobile navigation opens from the right
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await page.getByRole('button', { name: 'فتح التنقل' }).click();
	await expect(page.locator('aside')).toHaveClass(/is-open/);
	const mobileAside = await page.locator('aside').boundingBox();
	expect(mobileAside).not.toBeNull();
	expect(mobileAside!.x).toBeGreaterThan(0);
	await page.setViewportSize({ width: 1280, height: 720 });

	await page.goto('/profile');
	await expect(page.getByRole('heading', { name: 'الملف الشخصي' })).toBeVisible();
	await expect(page.locator('#locale')).toHaveValue('ar');

	// Wait for Svelte hydration before interacting with the bound language select
	await page.waitForFunction(() => {
		const select = document.querySelector('#locale') as
			(HTMLSelectElement & { __value?: unknown }) | null;
		return select !== null && select.__value !== undefined;
	});

	// Saving the language in the profile persists it and reloads the page
	await page.locator('#locale').selectOption('en');
	await page.waitForTimeout(300);
	await page
		.locator('form[action="?/updateProfile"]')
		.evaluate((form) => (form as HTMLFormElement).requestSubmit());
	await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 15_000 });
	await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
	await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
});
