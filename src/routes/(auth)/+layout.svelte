<script lang="ts">
	import { resolve } from '$app/paths';
	import logo from '#lib/assets/favicon.svg';
	import LocaleSwitcher from '#lib/components/layout/LocaleSwitcher.svelte';
	import { useI18n } from '#lib/i18n/index.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const { t } = useI18n();
</script>

<svelte:head>
	<title>{t('auth.pageTitle')}</title>
</svelte:head>

<div class="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
	<div class="absolute end-4 top-4">
		<LocaleSwitcher />
	</div>

	<div class="w-full max-w-md">
		<a href={resolve('/(app)')} class="mb-8 flex items-center justify-center gap-2.5">
			<img src={logo} alt="" class="h-10 w-10" />
			<span class="text-xl font-semibold tracking-tight text-slate-900">BeeProjects</span>
		</a>

		{@render children()}

		<p class="mt-8 text-center text-xs text-slate-400">
			{t('auth.footer')}
		</p>
	</div>
</div>
