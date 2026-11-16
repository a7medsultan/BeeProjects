<script lang="ts">
	import { List } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Task list · {data.project.name} · BeeProjects</title>
</svelte:head>

<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
	<List class="mx-auto h-10 w-10 text-slate-300" />
	<h2 class="mt-4 font-semibold text-slate-900">Task list arrives in M3</h2>
	<p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
		Search, filters, sorting, assignment, and pagination will live here. Project membership and
		activity are already functional.
	</p>
</div>
