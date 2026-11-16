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
	import TaskMiniCard from '#lib/components/tasks/TaskMiniCard.svelte';
	import { PROJECT_STATUS_CLASSES, PROJECT_STATUS_LABELS } from '#lib/constants.ts';
	import { formatDate } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const stats = $derived([
		{
			label: 'Active projects',
			value: data.stats.activeProjects,
			icon: FolderKanban,
			tone: 'text-indigo-600 bg-indigo-50'
		},
		{
			label: 'Open tasks',
			value: data.stats.openTasks,
			icon: ListTodo,
			tone: 'text-sky-600 bg-sky-50'
		},
		{
			label: 'Completed tasks',
			value: data.stats.completedTasks,
			icon: CheckCircle2,
			tone: 'text-emerald-600 bg-emerald-50'
		},
		{
			label: 'Overdue tasks',
			value: data.stats.overdueTasks,
			icon: CircleAlert,
			tone: 'text-rose-600 bg-rose-50'
		},
		{
			label: 'Due today',
			value: data.stats.dueToday,
			icon: CalendarClock,
			tone: 'text-amber-600 bg-amber-50'
		}
	]);

	const workColumns = $derived([
		{
			label: 'Assigned to me',
			count: data.myWork.assignedCount,
			tasks: data.myWork.assigned
		},
		{
			label: 'Overdue',
			count: data.myWork.overdueCount,
			tasks: data.myWork.overdue
		},
		{
			label: 'Upcoming',
			count: data.myWork.upcomingCount,
			tasks: data.myWork.upcoming
		}
	]);

	const timezone = $derived(data.user?.timezone ?? 'UTC');
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
				Your projects, assigned work, and deadline overview in one place.
			</p>
		</div>
		<a
			href={resolve('/(app)/my-tasks')}
			class="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:self-auto"
		>
			Open My Tasks
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
					View all
				</a>
			</div>

			<div class="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
				{#each workColumns as column (column.label)}
					<div>
						<div class="flex items-center justify-between gap-2">
							<h4 class="text-sm font-medium text-slate-700">{column.label}</h4>
							<span
								class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
							>
								{column.count}
							</span>
						</div>
						<div class="mt-3 space-y-2">
							{#each column.tasks as task (task.id)}
								<TaskMiniCard {task} {timezone} showProject />
							{:else}
								<div class="rounded-lg border border-dashed border-slate-200 p-4 text-center">
									<p class="text-xs text-slate-400">Nothing here.</p>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="rounded-xl border border-slate-200 bg-white shadow-sm">
			<div class="border-b border-slate-100 px-5 py-4">
				<h3 class="font-semibold text-slate-900">Recently updated</h3>
				<p class="text-xs text-slate-500">Tasks changed in the last 7 days</p>
			</div>
			<div class="space-y-2 p-5">
				{#each data.myWork.recentlyUpdated as task (task.id)}
					<TaskMiniCard {task} {timezone} showProject />
				{:else}
					<div class="rounded-lg border border-dashed border-slate-200 p-6 text-center">
						<p class="text-sm text-slate-500">No recent task updates.</p>
					</div>
				{/each}
			</div>
		</section>
	</div>

	<section class="rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
			<div>
				<h3 class="font-semibold text-slate-900">Project overview</h3>
				<p class="text-xs text-slate-500">Progress across visible, non-archived projects</p>
			</div>
			<a
				href={resolve('/(app)/projects')}
				class="text-sm font-medium text-indigo-600 hover:text-indigo-700"
			>
				All projects
			</a>
		</div>

		{#if data.projects.length === 0}
			<div class="p-8 text-center">
				<FolderKanban class="mx-auto h-8 w-8 text-slate-300" />
				<p class="mt-3 text-sm font-medium text-slate-700">No visible projects yet</p>
				<p class="mt-1 text-xs text-slate-500">
					Admins and project managers can create the first project.
				</p>
				<a
					href={resolve('/(app)/projects')}
					class="mt-3 inline-flex text-xs font-semibold text-indigo-600 hover:text-indigo-700"
				>
					Open projects
				</a>
			</div>
		{:else}
			<ul class="divide-y divide-slate-100">
				{#each data.projects as project (project.id)}
					<li class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<a
									href={resolve('/(app)/projects/[id]', { id: project.id })}
									class="font-medium text-slate-900 hover:text-indigo-700"
								>
									{project.name}
								</a>
								<span
									class={[
										'rounded-full px-2 py-0.5 text-xs font-medium',
										PROJECT_STATUS_CLASSES[project.status]
									]}
								>
									{PROJECT_STATUS_LABELS[project.status]}
								</span>
							</div>
							<p class="mt-0.5 text-xs text-slate-500">
								{project.ownerName} · {project.memberCount} member{project.memberCount === 1
									? ''
									: 's'}
								{#if project.dueDate}
									· Due {formatDate(project.dueDate)}
								{/if}
							</p>
						</div>

						<div class="w-full sm:w-52">
							<div class="flex items-center justify-between text-xs text-slate-500">
								<span>{project.completedTasks}/{project.totalTasks} tasks</span>
								<span class="font-medium text-slate-700">{project.progress}%</span>
							</div>
							<div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
								<div
									class="h-full rounded-full bg-indigo-500"
									style={`width: ${project.progress}%`}
								></div>
							</div>
						</div>
					</li>
				{/each}
			</ul>

			{#if data.projectTotal > data.projects.length}
				<div class="border-t border-slate-100 px-5 py-3 text-right">
					<a
						href={resolve('/(app)/projects')}
						class="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
					>
						View all {data.projectTotal} projects
					</a>
				</div>
			{/if}
		{/if}
	</section>

	<section class="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h3 class="font-semibold text-indigo-950">Milestone M6 complete</h3>
				<p class="mt-1 text-sm text-indigo-900/70">
					Comments, mentions, attachments, in-app notifications, and deadline reminders are ready.
					Next: final hardening, end-to-end tests, backups, and acceptance (M7).
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
