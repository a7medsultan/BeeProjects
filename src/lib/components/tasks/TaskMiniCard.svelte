<script lang="ts">
	import { resolve } from '$app/paths';
	import { ListChecks } from '@lucide/svelte';
	import { TASK_PRIORITY_CLASSES, TASK_STATUS_CLASSES } from '#lib/constants.ts';
	import { formatDate, isDueSoon } from '#lib/format.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import { TASK_PRIORITY_KEYS, TASK_STATUS_KEYS } from '#lib/i18n/labels.ts';
	import type { TaskListItem } from '#lib/types.ts';

	interface Props {
		task: TaskListItem;
		timezone: string;
		showProject?: boolean;
	}

	let { task, timezone, showProject = false }: Props = $props();

	const { t, locale } = useI18n();

	const dueSoon = $derived(task.status !== 'Done' && isDueSoon(task.dueDate, timezone));
</script>

<div class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
	<div class="flex items-start justify-between gap-2">
		<a
			href={resolve('/(app)/tasks/[id]', { id: task.id })}
			dir="auto"
			class="user-text min-w-0 text-sm font-medium text-slate-800 hover:text-indigo-700"
		>
			{task.title}
		</a>
		<span
			class={[
				'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
				TASK_PRIORITY_CLASSES[task.priority]
			]}
		>
			{t(TASK_PRIORITY_KEYS[task.priority])}
		</span>
	</div>

	<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
		{#if showProject}
			<a
				href={resolve('/(app)/projects/[id]', { id: task.projectId })}
				dir="auto"
				class="user-text max-w-40 truncate font-medium text-slate-600 hover:text-indigo-700"
			>
				{task.projectName}
			</a>
		{/if}
		<span
			class={['rounded-full px-2 py-0.5 text-[11px] font-medium', TASK_STATUS_CLASSES[task.status]]}
		>
			{t(TASK_STATUS_KEYS[task.status])}
		</span>
		{#if task.dueDate}
			<span
				class={[
					'inline-flex items-center gap-1',
					task.isOverdue ? 'font-medium text-rose-600' : dueSoon ? 'font-medium text-amber-600' : ''
				]}
			>
				{formatDate(task.dueDate, locale)}
				{#if task.isOverdue}
					· {t('common.overdue')}
				{:else if dueSoon}
					· {t('common.dueSoon')}
				{/if}
			</span>
		{/if}
		{#if task.subtaskCount > 0}
			<span class="inline-flex items-center gap-1">
				<ListChecks class="h-3.5 w-3.5" />
				{task.completedSubtaskCount}/{task.subtaskCount}
			</span>
		{/if}
	</div>

	<div class="mt-2 flex flex-wrap gap-1">
		{#each task.assignees as assignee (assignee.userId)}
			<span
				dir="auto"
				class="user-text rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
			>
				{assignee.name}{assignee.isActive ? '' : ` (${t('common.inactive')})`}
			</span>
		{:else}
			<span class="text-[11px] text-slate-400">{t('common.unassigned')}</span>
		{/each}
	</div>
</div>
