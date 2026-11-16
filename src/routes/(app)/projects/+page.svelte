<script lang="ts">
	import { resolve } from '$app/paths';
	import { CalendarDays, FolderKanban, Plus, Search, Users } from '@lucide/svelte';
	import {
		PROJECT_PRIORITY_CLASSES,
		PROJECT_PRIORITY_LABELS,
		PROJECT_STATUS_CLASSES,
		PROJECT_STATUS_LABELS,
		PROJECT_STATUSES
	} from '#lib/constants.ts';
	import { formatDate, formatDateTime } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function pageQuery(page: number): string {
		const params: string[] = [];
		if (data.filters.q) params.push(`q=${encodeURIComponent(data.filters.q)}`);
		if (data.filters.status !== 'open') {
			params.push(`status=${encodeURIComponent(data.filters.status)}`);
		}
		if (data.filters.owner !== 'all') {
			params.push(`owner=${encodeURIComponent(data.filters.owner)}`);
		}
		params.push(`page=${page}`);
		return params.join('&');
	}

	const showingFrom = $derived(data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1);
	const showingTo = $derived(Math.min(data.page * data.pageSize, data.total));
	const timezone = $derived(data.user?.timezone ?? 'UTC');
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
		{#if data.canCreate}
			<a
				href={resolve('/(app)/projects/new')}
				class="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:self-auto"
			>
				<Plus class="h-4 w-4" />
				New project
			</a>
		{/if}
	</div>

	<form
		method="GET"
		action={resolve('/(app)/projects')}
		class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto_auto_auto]"
	>
		<div class="relative">
			<label for="q" class="sr-only">Search projects</label>
			<Search
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
			/>
			<input
				id="q"
				name="q"
				type="search"
				value={data.filters.q}
				placeholder="Search projects"
				class="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			/>
		</div>

		<div>
			<label for="status" class="sr-only">Status</label>
			<select
				id="status"
				name="status"
				value={data.filters.status}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			>
				<option value="open">Open projects</option>
				<option value="all">All statuses</option>
				{#each PROJECT_STATUSES as status (status)}
					<option value={status}>{PROJECT_STATUS_LABELS[status]}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="owner" class="sr-only">Owner</label>
			<select
				id="owner"
				name="owner"
				value={data.filters.owner}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			>
				<option value="all">All owners</option>
				{#each data.owners as owner (owner.id)}
					<option value={owner.id}>{owner.name}</option>
				{/each}
			</select>
		</div>

		<button
			type="submit"
			class="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
		>
			Filter
		</button>
	</form>

	{#if data.projects.length === 0}
		<div class="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
			<FolderKanban class="mx-auto h-10 w-10 text-slate-300" />
			<h3 class="mt-4 font-semibold text-slate-900">No projects found</h3>
			<p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
				{data.filters.q || data.filters.owner !== 'all' || data.filters.status !== 'open'
					? 'Try changing the filters, or clear the search.'
					: data.canCreate
						? 'Create the first project to get the team started.'
						: 'You have not been added to any projects yet.'}
			</p>
			{#if data.canCreate}
				<a
					href={resolve('/(app)/projects/new')}
					class="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
				>
					<Plus class="h-4 w-4" />
					Create project
				</a>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each data.projects as project (project.id)}
				<a
					href={resolve('/(app)/projects/[id]', { id: project.id })}
					class="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<h3 class="truncate font-semibold text-slate-900 group-hover:text-indigo-700">
								{project.name}
							</h3>
							<p class="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">
								{project.description || 'No description.'}
							</p>
						</div>
						<span
							class={[
								'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
								PROJECT_STATUS_CLASSES[project.status]
							]}
						>
							{PROJECT_STATUS_LABELS[project.status]}
						</span>
					</div>

					<div class="mt-4 flex items-center justify-between text-xs text-slate-500">
						<span
							class={[
								'rounded-full px-2 py-0.5 font-medium',
								PROJECT_PRIORITY_CLASSES[project.priority]
							]}
						>
							{PROJECT_PRIORITY_LABELS[project.priority]} priority
						</span>
						<span>{project.progress}% complete</span>
					</div>

					<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
						<div
							class="h-full rounded-full bg-indigo-500 transition-all"
							style={`width: ${project.progress}%`}
						></div>
					</div>

					<div class="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
						<span class="flex items-center gap-1.5">
							<Users class="h-3.5 w-3.5 text-slate-400" />
							{project.memberCount} member{project.memberCount === 1 ? '' : 's'}
						</span>
						<span class="flex items-center gap-1.5">
							<CalendarDays class="h-3.5 w-3.5 text-slate-400" />
							{project.dueDate ? formatDate(project.dueDate) : 'No due date'}
						</span>
					</div>

					<div
						class="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs"
					>
						<span class="truncate text-slate-500">Owner: {project.ownerName}</span>
						{#if project.overdueTasks > 0}
							<span class="font-medium text-rose-600">{project.overdueTasks} overdue</span>
						{:else}
							<span class="text-slate-400">{project.completedTasks}/{project.totalTasks} tasks</span
							>
						{/if}
					</div>
					<p class="mt-2 text-[11px] text-slate-400">
						Updated {formatDateTime(project.updatedAt, timezone)}
					</p>
				</a>
			{/each}
		</div>

		<div
			class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
		>
			<p class="text-xs text-slate-500">
				Showing {showingFrom}–{showingTo} of {data.total} projects
			</p>
			<div class="flex items-center gap-2">
				{#if data.page > 1}
					<a
						href={resolve(`/(app)/projects?${pageQuery(data.page - 1)}`)}
						class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
					>
						Previous
					</a>
				{/if}
				<span class="text-xs text-slate-500">Page {data.page} of {data.totalPages}</span>
				{#if data.page < data.totalPages}
					<a
						href={resolve(`/(app)/projects?${pageQuery(data.page + 1)}`)}
						class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
					>
						Next
					</a>
				{/if}
			</div>
		</div>
	{/if}
</div>
