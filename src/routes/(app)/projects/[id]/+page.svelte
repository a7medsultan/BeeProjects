<script lang="ts">
	import { resolve } from '$app/paths';
	import { CalendarClock, CheckCircle2, CircleAlert, ListTodo, Users } from '@lucide/svelte';
	import ActivityTimeline from '#lib/components/activity/ActivityTimeline.svelte';
	import { ROLE_LABELS } from '#lib/constants.ts';
	import { formatDate, formatDateTime } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const stats = $derived([
		{
			label: 'Total tasks',
			value: data.project.totalTasks,
			icon: ListTodo,
			tone: 'text-sky-600 bg-sky-50'
		},
		{
			label: 'Completed',
			value: data.project.completedTasks,
			icon: CheckCircle2,
			tone: 'text-emerald-600 bg-emerald-50'
		},
		{
			label: 'Overdue',
			value: data.project.overdueTasks,
			icon: CircleAlert,
			tone: 'text-rose-600 bg-rose-50'
		},
		{
			label: 'Progress',
			value: `${data.project.progress}%`,
			icon: CalendarClock,
			tone: 'text-indigo-600 bg-indigo-50'
		}
	]);

	const timezone = $derived(data.user?.timezone ?? 'UTC');
</script>

<svelte:head>
	<title>{data.project.name} · BeeProjects</title>
</svelte:head>

<div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
	<div class="space-y-6 xl:col-span-2">
		<section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

		<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 class="font-semibold text-slate-900">About this project</h2>
			<p class="mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-600">
				{data.project.description || 'No description has been added yet.'}
			</p>

			<dl class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="rounded-lg bg-slate-50 p-3">
					<dt class="text-xs font-medium tracking-wide text-slate-400 uppercase">Start date</dt>
					<dd class="mt-1 text-sm text-slate-800">
						{data.project.startDate ? formatDate(data.project.startDate) : 'Not set'}
					</dd>
				</div>
				<div class="rounded-lg bg-slate-50 p-3">
					<dt class="text-xs font-medium tracking-wide text-slate-400 uppercase">Due date</dt>
					<dd class="mt-1 text-sm text-slate-800">
						{data.project.dueDate ? formatDate(data.project.dueDate) : 'Not set'}
					</dd>
				</div>
				<div class="rounded-lg bg-slate-50 p-3">
					<dt class="text-xs font-medium tracking-wide text-slate-400 uppercase">Owner</dt>
					<dd class="mt-1 text-sm text-slate-800">{data.project.ownerName}</dd>
				</div>
				<div class="rounded-lg bg-slate-50 p-3">
					<dt class="text-xs font-medium tracking-wide text-slate-400 uppercase">Last updated</dt>
					<dd class="mt-1 text-sm text-slate-800">
						{formatDateTime(data.project.updatedAt, timezone)}
					</dd>
				</div>
			</dl>
		</section>

		<section class="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
			<ListTodo class="mx-auto h-9 w-9 text-slate-300" />
			<h3 class="mt-3 font-semibold text-slate-900">Task management is live</h3>
			<p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
				Browse, search, create, and update tasks in the List view. The Kanban board arrives in M4.
			</p>
			<div class="mt-4 flex flex-wrap items-center justify-center gap-3">
				<a
					href={resolve('/(app)/projects/[id]/list', { id: data.project.id })}
					class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
				>
					Open task list
				</a>
				{#if data.permissions.canManage}
					<a
						href={resolve('/(app)/projects/[id]/tasks/new', { id: data.project.id })}
						class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
					>
						New task
					</a>
					<a
						href={resolve('/(app)/projects/[id]/members', { id: data.project.id })}
						class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
					>
						Manage members
					</a>
				{/if}
				<a
					href={resolve('/(app)/projects/[id]/activity', { id: data.project.id })}
					class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
				>
					View activity
				</a>
			</div>
		</section>
	</div>

	<div class="space-y-6">
		<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<h2 class="font-semibold text-slate-900">Members</h2>
				<a
					href={resolve('/(app)/projects/[id]/members', { id: data.project.id })}
					class="text-sm font-medium text-indigo-600 hover:text-indigo-700"
				>
					View all
				</a>
			</div>

			<ul class="mt-4 space-y-3">
				{#each data.members.slice(0, 6) as member (member.userId)}
					<li class="flex items-center gap-3">
						<div
							class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600"
						>
							{member.name.slice(0, 1).toUpperCase()}
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-slate-800">{member.name}</p>
							<p class="truncate text-xs text-slate-500">
								{ROLE_LABELS[member.role]}{member.isActive ? '' : ' · inactive'}
							</p>
						</div>
						{#if member.isOwner}
							<span
								class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
							>
								Owner
							</span>
						{/if}
					</li>
				{:else}
					<li class="flex items-center gap-2 text-sm text-slate-500">
						<Users class="h-4 w-4 text-slate-400" />
						No members yet.
					</li>
				{/each}
			</ul>
		</section>

		<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<h2 class="font-semibold text-slate-900">Recent activity</h2>
				<a
					href={resolve('/(app)/projects/[id]/activity', { id: data.project.id })}
					class="text-sm font-medium text-indigo-600 hover:text-indigo-700"
				>
					View all
				</a>
			</div>
			<div class="mt-4">
				<ActivityTimeline
					items={data.recentActivity}
					{timezone}
					emptyMessage="Project activity will appear here."
				/>
			</div>
		</section>
	</div>
</div>
