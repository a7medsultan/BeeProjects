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
