<script lang="ts">
	import { ListChecks } from '@lucide/svelte';
</script>

<svelte:head>
	<title>My Tasks · BeeProjects</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-semibold tracking-tight text-slate-900">My Tasks</h2>
		<p class="mt-1 text-sm text-slate-500">
			Everything assigned to you, grouped by status and highlighted by deadline.
		</p>
	</div>

	<div class="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
		<ListChecks class="mx-auto h-10 w-10 text-slate-300" />
		<h3 class="mt-4 font-semibold text-slate-900">No assigned tasks yet</h3>
		<p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
			Task assignment and the My Tasks view arrive in milestones M3 and M4.
		</p>
	</div>
</div>
