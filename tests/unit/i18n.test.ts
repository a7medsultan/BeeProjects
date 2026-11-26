import { describe, expect, it } from 'vitest';
import { dirFor, resolveLocale } from '../../src/lib/i18n/locales.ts';
import { localizeServerMessage, translate, translatePlural } from '../../src/lib/i18n/index.ts';
import { ar } from '../../src/lib/i18n/messages/ar.ts';
import { en } from '../../src/lib/i18n/messages/en.ts';
import { formatDate } from '../../src/lib/format.ts';
import { notificationBody, notificationTitle } from '../../src/lib/i18n/content.ts';
import { createI18n } from '../../src/lib/i18n/index.ts';
import type { NotificationItem } from '../../src/lib/types.ts';

describe('locale resolution', () => {
	it('prefers the user preference, then the cookie, then Accept-Language', () => {
		expect(
			resolveLocale({
				userLocale: 'ar',
				cookieLocale: 'en',
				acceptLanguage: 'en-US,en;q=0.9'
			})
		).toBe('ar');

		expect(
			resolveLocale({
				userLocale: null,
				cookieLocale: 'ar',
				acceptLanguage: 'en-US,en;q=0.9'
			})
		).toBe('ar');

		expect(
			resolveLocale({
				userLocale: null,
				cookieLocale: null,
				acceptLanguage: 'ar-EG,ar;q=0.9,en;q=0.8'
			})
		).toBe('ar');

		expect(
			resolveLocale({
				userLocale: null,
				cookieLocale: null,
				acceptLanguage: 'fr-FR,fr;q=0.9'
			})
		).toBe('en');
	});

	it('maps Arabic to RTL and English to LTR', () => {
		expect(dirFor('ar')).toBe('rtl');
		expect(dirFor('en')).toBe('ltr');
	});
});

describe('translation', () => {
	it('has the same keys in English and Arabic', () => {
		expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
	});

	it('translates, interpolates, and pluralizes', () => {
		expect(translate('ar', 'common.signIn')).toBe('تسجيل الدخول');
		expect(translate('ar', 'common.pageOf', { page: 2, total: 5 })).toBe('الصفحة 2 من 5');
		expect(translatePlural('ar', 'common.memberCount', 1)).toBe('عضو واحد');
		expect(translatePlural('ar', 'common.memberCount', 2)).toBe('عضوان');
		expect(translatePlural('ar', 'common.memberCount', 3)).toBe('3 أعضاء');
		expect(translatePlural('ar', 'common.memberCount', 11)).toBe('11 عضوًا');
		expect(translatePlural('ar', 'common.memberCount', 0)).toBe('لا أعضاء');
	});

	it('localizes known server messages and preserves unknown ones', () => {
		expect(localizeServerMessage('ar', 'Project not found.')).toBe('المشروع غير موجود.');
		expect(localizeServerMessage('ar', 'A custom internal message')).toBe(
			'A custom internal message'
		);
	});

	it('formats Arabic dates with Arabic month names and Latin digits', () => {
		const formatted = formatDate('2026-11-27', 'ar');
		expect(formatted).toContain('نوفمبر');
		expect(formatted).toContain('2026');
		expect(formatted).not.toMatch(/[٠-٩]/);
	});

	it('renders notification content in the active locale from structured payload', () => {
		const i18n = createI18n('ar');
		const item: NotificationItem = {
			id: 'n1',
			type: 'task_assigned',
			title: 'Fallback title',
			body: 'Fallback body',
			projectId: null,
			taskId: null,
			commentId: null,
			actorName: 'Sara',
			payload: { variant: 'assigned', actorName: 'Sara', taskTitle: 'مهمة تجريبية' },
			isRead: false,
			createdAt: '2026-11-27T10:00:00.000Z'
		};

		expect(notificationTitle(item, i18n.t)).toBe('أسند إليك Sara مهمة');
		expect(notificationBody(item, i18n.t)).toBe('مهمة تجريبية');
	});
});
