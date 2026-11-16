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
