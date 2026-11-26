<script lang="ts">
	import { deserialize } from '$app/forms';
	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { GripVertical, Plus } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { SvelteSet } from 'svelte/reactivity';
	import { dragHandle, dragHandleZone } from 'svelte-dnd-action';
	import { toast } from 'svelte-sonner';
	import { TASK_PRIORITY_CLASSES, TASK_STATUSES } from '#lib/constants.ts';
	import { formatDate, isDueSoon } from '#lib/format.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import { TASK_PRIORITY_KEYS, TASK_STATUS_KEYS } from '#lib/i18n/labels.ts';
	import type { TaskListItem, TaskStatus } from '#lib/types.ts';
	import type { PageProps } from './$types';

	interface DndDetail {
		items: TaskListItem[];
		info: { trigger: string; id?: string };
	}

	type Columns = Record<TaskStatus, TaskListItem[]>;

	let { data }: PageProps = $props();

	const { t, locale } = useI18n();

	function emptyColumns(): Columns {
		return {
			Backlog: [],
			'To Do': [],
			'In Progress': [],
			Review: [],
			Done: []
		};
	}

	function groupTasks(tasks: TaskListItem[]): Columns {
		const columns = emptyColumns();

		for (const task of tasks) {
			columns[task.status].push(task);
		}

		return columns;
	}

	// eslint-disable-next-line svelte/prefer-writable-derived -- DnD mutates column arrays locally
	let columns = $state<Columns>(untrack(() => groupTasks(data.tasks)));

	$effect(() => {
		columns = groupTasks(data.tasks);
	});

	const moving = new SvelteSet<string>();

	function canMoveTask(task: TaskListItem): boolean {
		if (data.permissions.isArchived) return false;
		if (data.permissions.canManage) return true;
		return task.assignees.some((assignee) => assignee.userId === data.user?.id);
	}

	function handleConsider(status: TaskStatus, event: CustomEvent<DndDetail>): void {
		columns[status] = event.detail.items;
	}

	function handleFinalize(status: TaskStatus, event: CustomEvent<DndDetail>): void {
		const items = event.detail.items;
		const moved = items.filter((task) => task.status !== status);

		columns[status] = items.map((task) => (task.status === status ? task : { ...task, status }));

		for (const task of moved) {
			if (moving.has(task.id)) continue;

			if (canMoveTask(task)) {
				void moveTask(task.id, status);
			} else {
				toast.error(t('tasks.board.cannotMove'));
				void refreshAll();
			}
		}
	}

	async function moveTask(taskId: string, status: TaskStatus): Promise<void> {
		if (moving.has(taskId)) return;

		moving.add(taskId);

		try {
			const body = new FormData();
			body.set('taskId', taskId);
			body.set('status', status);

			const response = await fetch('?/move', {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});

			const result = deserialize(await response.text());

			if (result.type === 'failure') {
				const message = (result.data as { error?: string } | undefined)?.error;
				toast.error(message ?? t('tasks.board.couldNotMove'));
				await refreshAll();
			} else if (result.type === 'error') {
				toast.error(result.error.message || t('tasks.board.couldNotMove'));
				await refreshAll();
			} else {
				await refreshAll();
			}
		} catch {
			toast.error(t('tasks.board.couldNotMove'));
			await refreshAll();
		} finally {
			moving.delete(taskId);
		}
	}

	function handleStatusSelect(task: TaskListItem, status: TaskStatus): void {
		if (task.status === status) return;

		if (!canMoveTask(task)) {
			toast.error(t('tasks.board.cannotMove'));
			return;
		}

		columns[task.status] = columns[task.status].filter((item) => item.id !== task.id);
		columns[status] = [...columns[status], { ...task, status }];
		void moveTask(task.id, status);
	}
</script>

<svelte:head>
	<title>{t('tasks.board.pageTitle', { project: data.project.name })}</title>
</svelte:head>

<div class="space-y-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-xl font-semibold tracking-tight text-slate-900">
				{t('tasks.board.title')}
			</h2>
			<p class="mt-1 text-sm text-slate-500">{t('tasks.board.subtitle')}</p>
		</div>
		{#if data.permissions.canManage}
			<a
				href={resolve('/(app)/projects/[id]/tasks/new', { id: data.project.id })}
				class="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:self-auto"
			>
				<Plus class="h-4 w-4" />
				{t('tasks.board.newTask')}
			</a>
		{/if}
	</div>

	{#if data.permissions.isArchived}
		<p class="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm text-slate-700">
			{t('tasks.board.archivedNotice')}
		</p>
	{/if}

	<div class="overflow-x-auto pb-4">
		<div class="flex min-w-max gap-4">
			{#each TASK_STATUSES as status (status)}
				<section
					class="flex w-72 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50/80"
				>
					<header class="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
						<h3 class="text-sm font-semibold text-slate-800">{t(TASK_STATUS_KEYS[status])}</h3>
						<span class="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
							{columns[status].length}
						</span>
					</header>

					<ul
						class="min-h-24 space-y-2 p-2"
						use:dragHandleZone={{
							items: columns[status],
							type: 'task',
							flipDurationMs: 150,
							dropTargetStyle: {
								outline: '2px solid #6366f1',
								outlineOffset: '2px'
							}
						}}
						onconsider={(event) => handleConsider(status, event)}
						onfinalize={(event) => handleFinalize(status, event)}
					>
						{#each columns[status] as task (task.id)}
							<li
								class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
								animate:flip={{ duration: 150 }}
							>
								<div class="flex items-start gap-1.5">
									{#if canMoveTask(task)}
										<button
											use:dragHandle
											type="button"
											aria-label={t('common.dragTask', { title: task.title })}
											class="-ms-1 mt-0.5 inline-flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
										>
											<GripVertical class="h-4 w-4" />
										</button>
									{/if}

									<div class="min-w-0 flex-1">
										<a
											href={resolve('/(app)/tasks/[id]', { id: task.id })}
											dir="auto"
											class="user-text block text-sm leading-5 font-medium text-slate-800 hover:text-indigo-700"
										>
											{task.title}
										</a>

										<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
											<span
												class={[
													'rounded-full px-2 py-0.5 text-[11px] font-medium',
													TASK_PRIORITY_CLASSES[task.priority]
												]}
											>
												{t(TASK_PRIORITY_KEYS[task.priority])}
											</span>
											{#if task.subtaskCount > 0}
												<span
													class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
												>
													{t('common.subtaskRatio', {
														completed: task.completedSubtaskCount,
														total: task.subtaskCount
													})}
												</span>
											{/if}
										</div>

										{#if task.dueDate}
											<p
												class={[
													'mt-1.5 text-xs',
													task.isOverdue
														? 'font-medium text-rose-600'
														: task.status !== 'Done' &&
															  isDueSoon(task.dueDate, data.user?.timezone ?? 'UTC')
															? 'font-medium text-amber-600'
															: 'text-slate-500'
												]}
											>
												{formatDate(task.dueDate, locale)}
												{#if task.isOverdue}
													· {t('tasks.board.overdue')}
												{:else if task.status !== 'Done' && isDueSoon(task.dueDate, data.user?.timezone ?? 'UTC')}
													· {t('tasks.board.dueSoon')}
												{/if}
											</p>
										{/if}

										<p class="mt-1.5 truncate text-[11px] text-slate-500">
											{#if task.assignees.length > 0}
												{task.assignees.map((assignee) => assignee.name).join(', ')}
											{:else}
												{t('common.unassigned')}
											{/if}
										</p>
									</div>
								</div>

								{#if canMoveTask(task)}
									<div class="mt-2 border-t border-slate-100 pt-2">
										<label class="sr-only" for={`status-${task.id}`}>
											{t('tasks.board.moveStatus')}
										</label>
										<select
											id={`status-${task.id}`}
											value={task.status}
											onchange={(event) =>
												handleStatusSelect(task, event.currentTarget.value as TaskStatus)}
											class="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
										>
											{#each TASK_STATUSES as option (option)}
												<option value={option}>{t(TASK_STATUS_KEYS[option])}</option>
											{/each}
										</select>
									</div>
								{/if}
							</li>
						{/each}
					</ul>

					{#if columns[status].length === 0}
						<div class="px-3 pt-1 pb-4 text-center text-xs text-slate-400">
							{t('tasks.board.dropHere')}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	</div>
</div>
