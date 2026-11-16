<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		ArrowRight,
		CalendarClock,
		CheckCircle2,
		CircleAlert,
		FolderKanban,
		ListTodo
	} from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const stats = [
		{
			label: 'Active projects',
			value: 0,
			icon: FolderKanban,
			tone: 'text-indigo-600 bg-indigo-50'
		},
		{ label: 'Open tasks', value: 0, icon: ListTodo, tone: 'text-sky-600 bg-sky-50' },
		{
			label: 'Completed tasks',
			value: 0,
			icon: CheckCircle2,
			tone: 'text-emerald-600 bg-emerald-50'
		},
		{ label: 'Overdue tasks', value: 0, icon: CircleAlert, tone: 'text-rose-600 bg-rose-50' },
		{ label: 'Due today', value: 0, icon: CalendarClock, tone: 'text-amber-600 bg-amber-50' }
	];
</script>

<svelte:head>
	<title>Dashboard · BeeProjects</title>
</svelte:head>

<div class="space-y-8">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight text-slate-900">
				{data.user ? `Welcome back, ${data.user.name.split(' ')[0]}` : 'Welcome to BeeProjects'}
			</h2>
			<p class="mt-1 text-sm text-slate-500">
				Projects and task management are live. Kanban, My Tasks, and dashboard aggregation arrive
				next.
			</p>
		</div>
		<a
			href={resolve('/(app)/projects')}
			class="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:self-auto"
		>
			View projects
			<ArrowRight class="h-4 w-4" />
		</a>
	</div>

	<section
		aria-label="Overview statistics"
		class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
	>
		{#each stats as stat (stat.label)}
			<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-slate-500">{stat.label}</p>
					<span class={['rounded-lg p-2', stat.tone]}>
						<stat.icon class="h-4 w-4" />
					</span>
				</div>
				<p class="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
			</div>
		{/each}
	</section>

	<div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
		<section class="rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
			<div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
				<div>
					<h3 class="font-semibold text-slate-900">My work</h3>
					<p class="text-xs text-slate-500">Assigned, overdue, and upcoming tasks</p>
				</div>
				<a
					href={resolve('/(app)/my-tasks')}
					class="text-sm font-medium text-indigo-600 hover:text-indigo-700"
				>
					Open My Tasks
				</a>
			</div>
			<div class="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
				{#each ['Assigned to me', 'Overdue', 'Upcoming'] as group (group)}
					<div class="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4">
						<p class="text-sm font-medium text-slate-700">{group}</p>
						<p class="mt-6 text-sm text-slate-400">Nothing here yet.</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="rounded-xl border border-slate-200 bg-white shadow-sm">
			<div class="border-b border-slate-100 px-5 py-4">
				<h3 class="font-semibold text-slate-900">Project overview</h3>
				<p class="text-xs text-slate-500">Progress across visible projects</p>
			</div>
			<div class="p-5">
				<div
					class="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center"
				>
					<FolderKanban class="mx-auto h-8 w-8 text-slate-300" />
					<p class="mt-3 text-sm font-medium text-slate-700">Dashboard aggregation arrives in M4</p>
					<p class="mt-1 text-xs text-slate-500">
						Use the Projects page to browse and manage projects now.
					</p>
					<a
						href={resolve('/(app)/projects')}
						class="mt-3 inline-flex text-xs font-semibold text-indigo-600 hover:text-indigo-700"
					>
						Open projects
					</a>
				</div>
			</div>
		</section>
	</div>

	<section class="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h3 class="font-semibold text-indigo-950">Milestone M3 complete</h3>
				<p class="mt-1 text-sm text-indigo-900/70">
					Task creation, multiple assignees, subtasks, deadlines, status/priority updates, task
					activity, and the List view are ready. Next: Kanban, My Tasks, and dashboard (M4).
				</p>
			</div>
			<a
				href={resolve('/(app)/projects')}
				class="inline-flex items-center gap-2 self-start rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
			>
				Open projects
				<ArrowRight class="h-4 w-4" />
			</a>
		</div>
	</section>
</div>
