<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { ArrowLeft, Home } from '@lucide/svelte';
</script>

<svelte:head>
	<title>{page.status} · BeeProjects</title>
</svelte:head>

<div class="flex min-h-[60vh] items-center justify-center px-4">
	<div class="w-full max-w-md text-center">
		<p class="text-sm font-semibold tracking-widest text-indigo-600 uppercase">
			Error {page.status}
		</p>
		<h1 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
			{page.status === 404 ? 'Page not found' : 'Something went wrong'}
		</h1>
		<p class="mt-2 text-sm text-slate-500">
			{page.error?.message ?? 'The requested page could not be loaded.'}
		</p>

		<div class="mt-6 flex items-center justify-center gap-3">
			<a
				href={resolve('/(app)')}
				class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
			>
				<Home class="h-4 w-4" />
				Dashboard
			</a>
			<button
				type="button"
				class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
				onclick={() => history.back()}
			>
				<ArrowLeft class="h-4 w-4" />
				Go back
			</button>
		</div>
	</div>
</div>
