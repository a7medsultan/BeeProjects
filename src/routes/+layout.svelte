<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { Toaster } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import { setI18nContext } from '#lib/i18n/index.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	setI18nContext(untrack(() => data.locale));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>BeeProjects</title>
</svelte:head>

{@render children()}

<Toaster richColors position={data.dir === 'rtl' ? 'top-left' : 'top-right'} />
