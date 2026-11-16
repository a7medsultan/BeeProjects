<script lang="ts">
	import { Columns3 } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Board · {data.project.name} · BeeProjects</title>
</svelte:head>

<div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
	<Columns3 class="mx-auto h-10 w-10 text-slate-300" />
	<h2 class="mt-4 font-semibold text-slate-900">Kanban board arrives in M4</h2>
	<p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
		Drag-and-drop status changes, keyboard fallbacks, and subtask badges will live here.
	</p>
</div>
