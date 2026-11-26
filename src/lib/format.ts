import { localeForIntl, type Locale } from './i18n/locales.ts';

export function formatDateTime(
	value: string | null | undefined,
	timezone = 'UTC',
	locale: Locale = 'en'
): string {
	if (!value) return '—';

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';

	try {
		return new Intl.DateTimeFormat(localeForIntl(locale), {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			calendar: 'gregory',
			timeZone: timezone
		}).format(date);
	} catch {
		return new Intl.DateTimeFormat(localeForIntl(locale), {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			calendar: 'gregory',
			timeZone: 'UTC'
		}).format(date);
	}
}

export function formatDate(value: string | null | undefined, locale: Locale = 'en'): string {
	if (!value) return '—';

	const date = new Date(`${value}T00:00:00Z`);
	if (Number.isNaN(date.getTime())) return '—';

	return new Intl.DateTimeFormat(localeForIntl(locale), {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		calendar: 'gregory',
		timeZone: 'UTC'
	}).format(date);
}

export function formatNumber(value: number, locale: Locale = 'en'): string {
	return new Intl.NumberFormat(localeForIntl(locale)).format(value);
}

export function localDateISO(timezone: string, date = new Date()): string {
	try {
		return new Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).format(date);
	} catch {
		return new Intl.DateTimeFormat('en-CA', {
			timeZone: 'UTC',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).format(date);
	}
}

export function addDaysISO(dateISO: string, days: number): string {
	const date = new Date(`${dateISO}T00:00:00Z`);
	if (Number.isNaN(date.getTime())) return dateISO;
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

export function isDueSoon(dueDate: string | null | undefined, timezone: string): boolean {
	if (!dueDate) return false;

	const today = localDateISO(timezone);
	return dueDate >= today && dueDate <= addDaysISO(today, 7);
}

export function formatFileSize(bytes: number, locale: Locale = 'en'): string {
	if (bytes < 1024) return `${formatNumber(bytes, locale)} B`;
	if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024, locale)} KB`;
	return `${formatNumber(bytes / (1024 * 1024), locale)} MB`;
}
