<script lang="ts">
	import { resolve } from '$app/paths';
	import { ListTodo, Plus, Search } from '@lucide/svelte';
	import {
		TASK_PRIORITIES,
		TASK_PRIORITY_CLASSES,
		TASK_STATUSES,
		TASK_STATUS_CLASSES
	} from '#lib/constants.ts';
	import { formatDate, formatDateTime } from '#lib/format.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import { TASK_PRIORITY_KEYS, TASK_STATUS_KEYS } from '#lib/i18n/labels.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const { t, locale } = useI18n();

	function pageQuery(page: number): string {
		const params: string[] = [];
		if (data.filters.q) params.push(`q=${encodeURIComponent(data.filters.q)}`);
		if (data.filters.status !== 'all') {
			params.push(`status=${encodeURIComponent(data.filters.status)}`);
		}
		if (data.filters.priority !== 'all') {
			params.push(`priority=${encodeURIComponent(data.filters.priority)}`);
		}
		if (data.filters.assignee !== 'all') {
			params.push(`assignee=${encodeURIComponent(data.filters.assignee)}`);
		}
		if (data.filters.due !== 'all') params.push(`due=${data.filters.due}`);
		if (data.filters.sort !== 'created_at') params.push(`sort=${data.filters.sort}`);
		if (data.filters.dir !== 'desc') params.push(`dir=${data.filters.dir}`);
		params.push(`page=${page}`);
		return params.join('&');
	}

	const showingFrom = $derived(data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1);
	const showingTo = $derived(Math.min(data.page * data.pageSize, data.total));
	const timezone = $derived(data.user?.timezone ?? 'UTC');
</script>

<svelte:head>
	<title>{t('tasks.list.pageTitle', { project: data.project.name })}</title>
</svelte:head>

<div class="space-y-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">{t('tasks.list.title')}</h2>
			<p class="mt-1 text-sm text-slate-500">{t('tasks.list.subtitle')}</p>
		</div>
		{#if data.canCreate}
			<a
				href={resolve('/(app)/projects/[id]/tasks/new', { id: data.project.id })}
				class="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:self-auto"
			>
				<Plus class="h-4 w-4" />
				{t('tasks.list.newTask')}
			</a>
		{/if}
	</div>

	<form
		method="GET"
		action={resolve('/(app)/projects/[id]/list', { id: data.project.id })}
		aria-label={t('tasks.list.ariaFilters')}
		class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4"
	>
		<div class="relative xl:col-span-2">
			<label for="q" class="sr-only">{t('tasks.list.searchLabel')}</label>
			<Search
				class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
			/>
			<input
				id="q"
				name="q"
				type="search"
				dir="auto"
				value={data.filters.q}
				placeholder={t('tasks.list.searchLongPlaceholder')}
				class="w-full rounded-lg border border-slate-300 bg-white py-2.5 ps-9 pe-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			/>
		</div>

		<div>
			<label for="status" class="sr-only">{t('tasks.list.status')}</label>
			<select
				id="status"
				name="status"
				value={data.filters.status}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			>
				<option value="all">{t('tasks.list.allStatuses')}</option>
				{#each TASK_STATUSES as status (status)}
					<option value={status}>{t(TASK_STATUS_KEYS[status])}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="priority" class="sr-only">{t('tasks.list.priority')}</label>
			<select
				id="priority"
				name="priority"
				value={data.filters.priority}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			>
				<option value="all">{t('tasks.list.allPriorities')}</option>
				{#each TASK_PRIORITIES as priority (priority)}
					<option value={priority}>{t(TASK_PRIORITY_KEYS[priority])}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="assignee" class="sr-only">{t('tasks.list.assigneeFilterLabel')}</label>
			<select
				id="assignee"
				name="assignee"
				value={data.filters.assignee}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			>
				<option value="all">{t('tasks.list.allAssignees')}</option>
				{#each data.assignees as member (member.userId)}
					<option value={member.userId}>
						{member.name}{member.isActive ? '' : ` (${t('common.inactive')})`}
					</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="due" class="sr-only">{t('tasks.list.dueDateLabel')}</label>
			<select
				id="due"
				name="due"
				value={data.filters.due}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			>
				<option value="all">{t('tasks.list.dueAll')}</option>
				<option value="overdue">{t('tasks.list.overdue')}</option>
				<option value="today">{t('tasks.list.dueToday')}</option>
				<option value="week">{t('tasks.list.nextSeven')}</option>
			</select>
		</div>

		<div>
			<label for="sort" class="sr-only">{t('tasks.list.sortBy')}</label>
			<select
				id="sort"
				name="sort"
				value={data.filters.sort}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			>
				<option value="created_at">{t('tasks.list.sortCreated')}</option>
				<option value="due_date">{t('tasks.list.sortDueDate')}</option>
				<option value="priority">{t('tasks.list.sortPriority')}</option>
			</select>
		</div>

		<div class="flex gap-2">
			<div class="flex-1">
				<label for="dir" class="sr-only">{t('tasks.list.sortDirection')}</label>
				<select
					id="dir"
					name="dir"
					value={data.filters.dir}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				>
					<option value="desc">{t('tasks.list.descending')}</option>
					<option value="asc">{t('tasks.list.ascending')}</option>
				</select>
			</div>
			<button
				type="submit"
				class="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
			>
				{t('projects.filter')}
			</button>
		</div>
	</form>

	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm">
				<thead
					class="bg-slate-50 text-start text-xs font-semibold tracking-wide text-slate-500 uppercase"
				>
					<tr>
						<th scope="col" class="px-4 py-3">{t('tasks.list.task')}</th>
						<th scope="col" class="px-4 py-3">{t('tasks.list.assignees')}</th>
						<th scope="col" class="px-4 py-3">{t('tasks.list.priority')}</th>
						<th scope="col" class="px-4 py-3">{t('tasks.list.status')}</th>
						<th scope="col" class="px-4 py-3">{t('tasks.list.due')}</th>
						<th scope="col" class="px-4 py-3">{t('tasks.list.updated')}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each data.tasks as task (task.id)}
						<tr class="transition hover:bg-slate-50/70">
							<td class="max-w-md px-4 py-3">
								<div class="flex flex-wrap items-center gap-2">
									<a
										href={resolve('/(app)/tasks/[id]', { id: task.id })}
										dir="auto"
										class="user-text font-medium text-slate-900 hover:text-indigo-700"
									>
										{task.title}
									</a>
									{#if task.parentTaskId}
										<span
											class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
										>
											{t('tasks.list.subtaskBadge')}
										</span>
									{/if}
									{#if task.subtaskCount > 0}
										<span
											class="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
										>
											{t('tasks.list.subtasks', {
												completed: task.completedSubtaskCount,
												total: task.subtaskCount
											})}
										</span>
									{/if}
								</div>
								{#if task.parentTitle}
									<p dir="auto" class="user-text mt-0.5 text-xs text-slate-400">
										{t('tasks.list.underParent', { title: task.parentTitle })}
									</p>
								{/if}
							</td>
							<td class="px-4 py-3">
								{#if task.assignees.length > 0}
									<div class="flex flex-wrap gap-1.5">
										{#each task.assignees as assignee (assignee.userId)}
											<span
												dir="auto"
												class={[
													'user-text rounded-full px-2 py-0.5 text-xs',
													assignee.isActive
														? 'bg-slate-100 text-slate-700'
														: 'bg-amber-50 text-amber-700'
												]}
											>
												{assignee.name}
												{assignee.isActive ? '' : ` (${t('common.inactive')})`}
											</span>
										{/each}
									</div>
								{:else}
									<span class="text-xs text-slate-400">{t('tasks.list.unassigned')}</span>
								{/if}
							</td>
							<td class="px-4 py-3">
								<span
									class={[
										'rounded-full px-2 py-0.5 text-xs font-medium',
										TASK_PRIORITY_CLASSES[task.priority]
									]}
								>
									{t(TASK_PRIORITY_KEYS[task.priority])}
								</span>
							</td>
							<td class="px-4 py-3">
								<span
									class={[
										'rounded-full px-2 py-0.5 text-xs font-medium',
										TASK_STATUS_CLASSES[task.status]
									]}
								>
									{t(TASK_STATUS_KEYS[task.status])}
								</span>
							</td>
							<td class="px-4 py-3">
								{#if task.dueDate}
									<span class={task.isOverdue ? 'font-medium text-rose-600' : 'text-slate-600'}>
										{formatDate(task.dueDate, locale)}
									</span>
									{#if task.isOverdue}
										<span class="ms-1 text-[11px] font-medium text-rose-600">
											{t('tasks.list.overdueLabel')}
										</span>
									{/if}
								{:else}
									<span class="text-xs text-slate-400">{t('common.noDueDate')}</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-xs text-slate-500">
								{formatDateTime(task.updatedAt, timezone, locale)}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="px-4 py-12 text-center">
								<ListTodo class="mx-auto h-8 w-8 text-slate-300" />
								<p class="mt-2 text-sm text-slate-500">{t('tasks.list.noMatch')}</p>
								{#if data.canCreate}
									<a
										href={resolve('/(app)/projects/[id]/tasks/new', { id: data.project.id })}
										class="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
									>
										<Plus class="h-4 w-4" />
										{t('tasks.list.createFirst')}
									</a>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div
			class="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
		>
			<p class="text-xs text-slate-500">
				{t('common.showingTasks', { from: showingFrom, to: showingTo, total: data.total })}
			</p>
			<div class="flex items-center gap-2">
				{#if data.page > 1}
					<a
						href={resolve(`/(app)/projects/[id]/list?${pageQuery(data.page - 1)}`, {
							id: data.project.id
						})}
						class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
					>
						{t('common.previous')}
					</a>
				{/if}
				<span class="text-xs text-slate-500">
					{t('common.pageOf', { page: data.page, total: data.totalPages })}
				</span>
				{#if data.page < data.totalPages}
					<a
						href={resolve(`/(app)/projects/[id]/list?${pageQuery(data.page + 1)}`, {
							id: data.project.id
						})}
						class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
					>
						{t('common.next')}
					</a>
				{/if}
			</div>
		</div>
	</div>
</div>
