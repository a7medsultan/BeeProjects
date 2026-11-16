let cachedTimezones: string[] | null = null;

export function getSupportedTimezones(): string[] {
	if (cachedTimezones) return cachedTimezones;

	const set = new Set<string>(['UTC']);

	try {
		// Node 22 and modern browsers support Intl.supportedValuesOf.
		const values = Intl.supportedValuesOf('timeZone');
		for (const value of values) set.add(value);
	} catch {
		// Fall back to UTC if the runtime does not support the API.
	}

	cachedTimezones = [...set].sort((a, b) => a.localeCompare(b));
	return cachedTimezones;
}

export function isValidTimezone(timezone: string): boolean {
	return getSupportedTimezones().includes(timezone);
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

export function localHour(timezone: string, date = new Date()): number {
	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			hour: 'numeric',
			hour12: false
		}).formatToParts(date);
		const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
		return Number.isFinite(hour) ? hour % 24 : 0;
	} catch {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: 'UTC',
			hour: 'numeric',
			hour12: false
		}).formatToParts(date);
		return Number(parts.find((part) => part.type === 'hour')?.value ?? '0') % 24;
	}
}
