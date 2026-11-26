export const LOCALES = ['en', 'ar'] as const;

export type Locale = (typeof LOCALES)[number];
export type Direction = 'ltr' | 'rtl';

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'bp_locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
	return value === 'en' || value === 'ar';
}

export function dirFor(locale: Locale): Direction {
	return locale === 'ar' ? 'rtl' : 'ltr';
}

export function localeForIntl(locale: Locale): string {
	return locale === 'ar' ? 'ar-u-nu-latn' : 'en';
}

interface LocaleSources {
	userLocale?: string | null;
	cookieLocale?: string | null;
	acceptLanguage?: string | null;
}

function preferredFromAcceptLanguage(value: string | null | undefined): Locale | null {
	if (!value) return null;

	const preferences = value
		.split(',')
		.map((part, index) => {
			const [tag, ...parameters] = part.trim().split(';');
			const quality = parameters
				.map((parameter) => parameter.trim())
				.find((parameter) => parameter.startsWith('q='));
			const q = quality ? Number.parseFloat(quality.slice(2)) : 1;

			return {
				tag: tag?.toLowerCase() ?? '',
				q: Number.isFinite(q) ? q : 0,
				index
			};
		})
		.filter((entry) => entry.q > 0)
		.sort((a, b) => b.q - a.q || a.index - b.index);

	for (const preference of preferences) {
		if (preference.tag === 'ar' || preference.tag.startsWith('ar-')) return 'ar';
		if (preference.tag === 'en' || preference.tag.startsWith('en-')) return 'en';
		if (preference.tag === '*') return DEFAULT_LOCALE;
	}

	return null;
}

export function resolveLocale({ userLocale, cookieLocale, acceptLanguage }: LocaleSources): Locale {
	if (isLocale(userLocale)) return userLocale;
	if (isLocale(cookieLocale)) return cookieLocale;
	return preferredFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}
