<script lang="ts">
	import { resolve } from '$app/paths';
	import logo from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>Sign in · BeeProjects</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
	<div class="w-full max-w-md">
		<a href={resolve('/(app)')} class="mb-8 flex items-center justify-center gap-2.5">
			<img src={logo} alt="" class="h-10 w-10" />
			<span class="text-xl font-semibold tracking-tight text-slate-900">BeeProjects</span>
		</a>

		{@render children()}

		<p class="mt-8 text-center text-xs text-slate-400">
			Phase 0 · MVP foundation · local development
		</p>
	</div>
</div>
