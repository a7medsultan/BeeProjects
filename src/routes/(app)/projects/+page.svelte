<script lang="ts">
	import { FolderKanban, Plus } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Projects · BeeProjects</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight text-slate-900">Projects</h2>
			<p class="mt-1 text-sm text-slate-500">
				Plan work, add members, and track progress across the team.
			</p>
		</div>
		<button
			type="button"
			disabled
			class="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white opacity-60 sm:self-auto"
			title="Project creation is implemented in milestone M2"
		>
			<Plus class="h-4 w-4" />
			New project
		</button>
	</div>

	<div class="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
		<FolderKanban class="mx-auto h-10 w-10 text-slate-300" />
		<h3 class="mt-4 font-semibold text-slate-900">No projects yet</h3>
		<p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
			Project creation, membership, filters, and progress tracking arrive in milestone M2.
		</p>
	</div>
</div>
