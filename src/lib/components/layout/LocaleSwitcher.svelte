<script lang="ts">
	import { page } from '$app/state';
	import { Languages } from '@lucide/svelte';
	import { useI18n } from '#lib/i18n/index.ts';

	let { compact = false }: { compact?: boolean } = $props();

	const { locale, t } = useI18n();
	const redirectTo = $derived(page.url.pathname + page.url.search);
</script>

<form
	method="POST"
	action="/locale"
	class={[
		'inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm',
		compact ? 'text-[11px]' : 'text-xs'
	]}
	aria-label={t('common.language')}
>
	<input type="hidden" name="redirectTo" value={redirectTo} />
	<Languages class="mx-1 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
	<button
		type="submit"
		name="locale"
		value="en"
		lang="en"
		dir="ltr"
		aria-pressed={locale === 'en'}
		class={[
			'rounded-md px-2.5 py-1 font-medium transition',
			locale === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
		]}
	>
		English
	</button>
	<button
		type="submit"
		name="locale"
		value="ar"
		lang="ar"
		dir="rtl"
		aria-pressed={locale === 'ar'}
		class={[
			'rounded-md px-2.5 py-1 font-medium transition',
			locale === 'ar' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
		]}
	>
		العربية
	</button>
</form>
