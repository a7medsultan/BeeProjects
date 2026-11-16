export function formatDateTime(value: string | null | undefined, timezone = 'UTC'): string {
	if (!value) return '—';

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';

	try {
		return new Intl.DateTimeFormat('en', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: timezone
		}).format(date);
	} catch {
		return new Intl.DateTimeFormat('en', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'UTC'
		}).format(date);
	}
}

export function formatDate(value: string | null | undefined): string {
	if (!value) return '—';

	const date = new Date(`${value}T00:00:00Z`);
	if (Number.isNaN(date.getTime())) return '—';

	return new Intl.DateTimeFormat('en', {
		dateStyle: 'medium',
		timeZone: 'UTC'
	}).format(date);
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
