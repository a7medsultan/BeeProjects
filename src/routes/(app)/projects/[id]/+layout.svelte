<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import {
		Archive,
		ArchiveRestore,
		ArrowLeft,
		CalendarDays,
		Columns3,
		History,
		LayoutDashboard,
		List,
		Pencil,
		Users
	} from '@lucide/svelte';
	import {
		PROJECT_PRIORITY_CLASSES,
		PROJECT_PRIORITY_LABELS,
		PROJECT_STATUS_CLASSES,
		PROJECT_STATUS_LABELS
	} from '#lib/constants.ts';
	import { formatDate } from '#lib/format.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const basePath = $derived(`/projects/${data.project.id}`);

	const tabs = $derived([
		{
			label: 'Overview',
			path: basePath,
			href: resolve('/(app)/projects/[id]', { id: data.project.id }),
			icon: LayoutDashboard
		},
		{
			label: 'List',
			path: `${basePath}/list`,
			href: resolve('/(app)/projects/[id]/list', { id: data.project.id }),
			icon: List
		},
		{
			label: 'Board',
			path: `${basePath}/board`,
			href: resolve('/(app)/projects/[id]/board', { id: data.project.id }),
			icon: Columns3
		},
		{
			label: 'Members',
			path: `${basePath}/members`,
			href: resolve('/(app)/projects/[id]/members', { id: data.project.id }),
			icon: Users
		},
		{
			label: 'Activity',
			path: `${basePath}/activity`,
			href: resolve('/(app)/projects/[id]/activity', { id: data.project.id }),
			icon: History
		}
	]);

	const pathname = $derived(page.url.pathname);
	const archiveAction = $derived(
		resolve('/(app)/projects/[id]', { id: data.project.id }) + '?/archive'
	);
	const unarchiveAction = $derived(
		resolve('/(app)/projects/[id]', { id: data.project.id }) + '?/unarchive'
	);
</script>

<svelte:head>
	<title>{data.project.name} · BeeProjects</title>
</svelte:head>

<div class="space-y-6">
	<a
		href={resolve('/(app)/projects')}
		class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
	>
		<ArrowLeft class="h-4 w-4" />
		Back to projects
	</a>

	<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
			<div class="min-w-0">
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="truncate text-2xl font-semibold tracking-tight text-slate-900">
						{data.project.name}
					</h1>
					<span
						class={[
							'rounded-full px-2.5 py-0.5 text-xs font-medium',
							PROJECT_STATUS_CLASSES[data.project.status]
						]}
					>
						{PROJECT_STATUS_LABELS[data.project.status]}
					</span>
					<span
						class={[
							'rounded-full px-2.5 py-0.5 text-xs font-medium',
							PROJECT_PRIORITY_CLASSES[data.project.priority]
						]}
					>
						{PROJECT_PRIORITY_LABELS[data.project.priority]} priority
					</span>
				</div>

				<p class="mt-2 max-w-3xl text-sm text-slate-500">
					{data.project.description || 'No description yet.'}
				</p>

				<div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
					<span
						>Owner: <span class="font-medium text-slate-700">{data.project.ownerName}</span></span
					>
					<span class="flex items-center gap-1.5">
						<Users class="h-3.5 w-3.5 text-slate-400" />
						{data.project.memberCount} member{data.project.memberCount === 1 ? '' : 's'}
					</span>
					<span class="flex items-center gap-1.5">
						<CalendarDays class="h-3.5 w-3.5 text-slate-400" />
						{data.project.dueDate ? `Due ${formatDate(data.project.dueDate)}` : 'No due date'}
					</span>
					<span>{data.project.completedTasks}/{data.project.totalTasks} tasks complete</span>
					{#if data.project.overdueTasks > 0}
						<span class="font-medium text-rose-600">{data.project.overdueTasks} overdue</span>
					{/if}
				</div>

				<div class="mt-4 max-w-xl">
					<div class="flex items-center justify-between text-xs text-slate-500">
						<span>Progress</span>
						<span class="font-medium text-slate-700">{data.project.progress}%</span>
					</div>
					<div class="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
						<div
							class="h-full rounded-full bg-indigo-500 transition-all"
							style={`width: ${data.project.progress}%`}
						></div>
					</div>
				</div>
			</div>

			<div class="flex shrink-0 flex-wrap items-center gap-2">
				{#if data.permissions.canManage}
					<a
						href={resolve('/(app)/projects/[id]/edit', { id: data.project.id })}
						class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
					>
						<Pencil class="h-4 w-4" />
						Edit
					</a>
				{/if}

				{#if data.permissions.canArchive}
					<form
						method="POST"
						action={archiveAction}
						onsubmit={(event) => {
							if (!confirm(`Archive “${data.project.name}”?`)) event.preventDefault();
						}}
					>
						<button
							type="submit"
							class="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
						>
							<Archive class="h-4 w-4" />
							Archive
						</button>
					</form>
				{:else if data.permissions.canUnarchive}
					<form method="POST" action={unarchiveAction}>
						<button
							type="submit"
							class="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
						>
							<ArchiveRestore class="h-4 w-4" />
							Unarchive
						</button>
					</form>
				{/if}
			</div>
		</div>
	</section>

	{#if data.permissions.isArchived}
		<div class="rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
			This project is archived and read-only. Unarchive it to make changes again.
		</div>
	{/if}

	<div class="border-b border-slate-200">
		<nav class="-mb-px flex gap-1 overflow-x-auto" aria-label="Project sections">
			{#each tabs as tab (tab.path)}
				<a
					href={tab.href}
					class={[
						'inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition',
						pathname === tab.path
							? 'border-indigo-600 text-indigo-700'
							: 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
					]}
					aria-current={pathname === tab.path ? 'page' : undefined}
				>
					<tab.icon class="h-4 w-4" />
					{tab.label}
				</a>
			{/each}
		</nav>
	</div>

	{@render children()}
</div>
