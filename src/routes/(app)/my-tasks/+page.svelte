<script lang="ts">
	import { resolve } from '$app/paths';
	import { CalendarClock, CheckCircle2, ListChecks } from '@lucide/svelte';
	import TaskMiniCard from '#lib/components/tasks/TaskMiniCard.svelte';
	import { TASK_STATUS_LABELS } from '#lib/constants.ts';
	import type { TaskStatus } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const statusOrder: TaskStatus[] = ['In Progress', 'Review', 'To Do', 'Backlog', 'Done'];

	const groups = $derived(
		statusOrder
			.map((status) => ({
				status,
				tasks: data.tasks.filter((task) => task.status === status)
			}))
			.filter((group) => group.tasks.length > 0)
	);

	const timezone = $derived(data.user?.timezone ?? 'UTC');
	const toggleHref = $derived(
		data.includeCompleted
			? resolve('/(app)/my-tasks')
			: resolve('/(app)/my-tasks?includeCompleted=1')
	);
</script>

<svelte:head>
	<title>My Tasks · BeeProjects</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight text-slate-900">My Tasks</h2>
			<p class="mt-1 text-sm text-slate-500">
				Tasks assigned to you across all active projects, grouped by status.
			</p>
		</div>
		<a
			href={toggleHref}
			class="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 sm:self-auto"
		>
			<CheckCircle2 class="h-4 w-4" />
			{data.includeCompleted ? 'Hide completed' : 'Show completed'}
		</a>
	</div>

	<section class="grid grid-cols-1 gap-3 sm:grid-cols-3">
		<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium text-slate-500">Assigned to me</p>
				<span class="rounded-lg bg-indigo-50 p-2 text-indigo-600">
					<ListChecks class="h-4 w-4" />
				</span>
			</div>
			<p class="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{data.tasks.length}</p>
		</div>
		<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium text-slate-500">Overdue</p>
				<span class="rounded-lg bg-rose-50 p-2 text-rose-600">
					<CalendarClock class="h-4 w-4" />
				</span>
			</div>
			<p class="mt-3 text-2xl font-semibold tracking-tight text-rose-600">{data.overdueCount}</p>
		</div>
		<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium text-slate-500">Due in 7 days</p>
				<span class="rounded-lg bg-amber-50 p-2 text-amber-600">
					<CalendarClock class="h-4 w-4" />
				</span>
			</div>
			<p class="mt-3 text-2xl font-semibold tracking-tight text-amber-600">{data.upcomingCount}</p>
		</div>
	</section>

	{#if groups.length === 0}
		<div class="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
			<ListChecks class="mx-auto h-10 w-10 text-slate-300" />
			<h3 class="mt-4 font-semibold text-slate-900">No assigned tasks</h3>
			<p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
				Tasks assigned to you in active projects will appear here. Tasks in archived projects are
				hidden.
			</p>
			<a
				href={resolve('/(app)/projects')}
				class="mt-4 inline-flex rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
			>
				Browse projects
			</a>
		</div>
	{:else}
		<div class="space-y-5">
			{#each groups as group (group.status)}
				<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
					<div class="flex items-center justify-between gap-3">
						<h3 class="font-semibold text-slate-900">{TASK_STATUS_LABELS[group.status]}</h3>
						<span
							class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
						>
							{group.tasks.length}
						</span>
					</div>
					<div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
						{#each group.tasks as task (task.id)}
							<TaskMiniCard {task} {timezone} showProject />
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>
