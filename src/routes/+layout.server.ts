import { dirFor } from '#lib/i18n/locales.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const locale = locals.locale ?? 'en';

	return {
		locale,
		dir: dirFor(locale)
	};
};
