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
	import { PROJECT_STATUS_CLASSES } from '#lib/constants.ts';
	import { formatDate, formatNumber } from '#lib/format.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import { PROJECT_STATUS_KEYS } from '#lib/i18n/labels.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const { t, tp, locale } = useI18n();

	const stats = $derived([
		{
			label: t('dashboard.activeProjects'),
			value: data.stats.activeProjects,
			icon: FolderKanban,
			tone: 'text-indigo-600 bg-indigo-50'
		},
		{
			label: t('dashboard.openTasks'),
			value: data.stats.openTasks,
			icon: ListTodo,
			tone: 'text-sky-600 bg-sky-50'
		},
		{
			label: t('dashboard.completedTasks'),
			value: data.stats.completedTasks,
			icon: CheckCircle2,
			tone: 'text-emerald-600 bg-emerald-50'
		},
		{
			label: t('dashboard.overdueTasks'),
			value: data.stats.overdueTasks,
			icon: CircleAlert,
			tone: 'text-rose-600 bg-rose-50'
		},
		{
			label: t('dashboard.dueToday'),
			value: data.stats.dueToday,
			icon: CalendarClock,
			tone: 'text-amber-600 bg-amber-50'
		}
	]);

	const workColumns = $derived([
		{
			label: t('dashboard.assignedToMe'),
			count: data.myWork.assignedCount,
			tasks: data.myWork.assigned
		},
		{
			label: t('dashboard.overdue'),
			count: data.myWork.overdueCount,
			tasks: data.myWork.overdue
		},
		{
			label: t('dashboard.upcoming'),
			count: data.myWork.upcomingCount,
			tasks: data.myWork.upcoming
		}
	]);

	const timezone = $derived(data.user?.timezone ?? 'UTC');
</script>

<svelte:head>
	<title>{t('dashboard.pageTitle')}</title>
</svelte:head>

<div class="space-y-8">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight text-slate-900">
				{data.user
					? t('dashboard.welcomeBack', { name: data.user.name.split(' ')[0] })
					: t('dashboard.welcome')}
			</h2>
			<p class="mt-1 text-sm text-slate-500">{t('dashboard.intro')}</p>
		</div>
		<a
			href={resolve('/(app)/my-tasks')}
			class="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:self-auto"
		>
			{t('dashboard.openMyTasks')}
			<ArrowRight class="h-4 w-4 rtl:-scale-x-100" />
		</a>
	</div>

	<section
		aria-label={t('dashboard.overviewAria')}
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
				<p class="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
					{formatNumber(stat.value, locale)}
				</p>
			</div>
		{/each}
	</section>

	<div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
		<section class="rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
			<div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
				<div>
					<h3 class="font-semibold text-slate-900">{t('dashboard.myWork')}</h3>
					<p class="text-xs text-slate-500">{t('dashboard.myWorkSubtitle')}</p>
				</div>
				<a
					href={resolve('/(app)/my-tasks')}
					class="text-sm font-medium text-indigo-600 hover:text-indigo-700"
				>
					{t('dashboard.viewAll')}
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
								{formatNumber(column.count, locale)}
							</span>
						</div>
						<div class="mt-3 space-y-2">
							{#each column.tasks as task (task.id)}
								<TaskMiniCard {task} {timezone} showProject />
							{:else}
								<div class="rounded-lg border border-dashed border-slate-200 p-4 text-center">
									<p class="text-xs text-slate-400">{t('dashboard.nothingHere')}</p>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="rounded-xl border border-slate-200 bg-white shadow-sm">
			<div class="border-b border-slate-100 px-5 py-4">
				<h3 class="font-semibold text-slate-900">{t('dashboard.recentlyUpdated')}</h3>
				<p class="text-xs text-slate-500">{t('dashboard.recentlyUpdatedSubtitle')}</p>
			</div>
			<div class="space-y-2 p-5">
				{#each data.myWork.recentlyUpdated as task (task.id)}
					<TaskMiniCard {task} {timezone} showProject />
				{:else}
					<div class="rounded-lg border border-dashed border-slate-200 p-6 text-center">
						<p class="text-sm text-slate-500">{t('dashboard.noRecent')}</p>
					</div>
				{/each}
			</div>
		</section>
	</div>

	<section class="rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
			<div>
				<h3 class="font-semibold text-slate-900">{t('dashboard.projectOverview')}</h3>
				<p class="text-xs text-slate-500">{t('dashboard.projectOverviewSubtitle')}</p>
			</div>
			<a
				href={resolve('/(app)/projects')}
				class="text-sm font-medium text-indigo-600 hover:text-indigo-700"
			>
				{t('dashboard.allProjects')}
			</a>
		</div>

		{#if data.projects.length === 0}
			<div class="p-8 text-center">
				<FolderKanban class="mx-auto h-8 w-8 text-slate-300" />
				<p class="mt-3 text-sm font-medium text-slate-700">
					{t('dashboard.noVisibleProjects')}
				</p>
				<p class="mt-1 text-xs text-slate-500">{t('dashboard.noVisibleProjectsHint')}</p>
				<a
					href={resolve('/(app)/projects')}
					class="mt-3 inline-flex text-xs font-semibold text-indigo-600 hover:text-indigo-700"
				>
					{t('dashboard.openProjects')}
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
									dir="auto"
									class="user-text font-medium text-slate-900 hover:text-indigo-700"
								>
									{project.name}
								</a>
								<span
									class={[
										'rounded-full px-2 py-0.5 text-xs font-medium',
										PROJECT_STATUS_CLASSES[project.status]
									]}
								>
									{t(PROJECT_STATUS_KEYS[project.status])}
								</span>
							</div>
							<p class="mt-0.5 text-xs text-slate-500">
								{project.ownerName} · {tp('common.memberCount', project.memberCount)}
								{#if project.dueDate}
									· {t('common.dueOn', { date: formatDate(project.dueDate, locale) })}
								{/if}
							</p>
						</div>

						<div class="w-full sm:w-52">
							<div class="flex items-center justify-between text-xs text-slate-500">
								<span
									>{t('common.taskRatio', {
										completed: project.completedTasks,
										total: project.totalTasks
									})}</span
								>
								<span class="font-medium text-slate-700">{project.progress}%</span>
							</div>
							<div
								class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"
								role="progressbar"
								aria-valuenow={project.progress}
								aria-valuemin="0"
								aria-valuemax="100"
								aria-label={t('projects.progressAria', { percent: project.progress })}
							>
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
				<div class="border-t border-slate-100 px-5 py-3 text-end">
					<a
						href={resolve('/(app)/projects')}
						class="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
					>
						{t('dashboard.viewAllProjects', { count: data.projectTotal })}
					</a>
				</div>
			{/if}
		{/if}
	</section>

	<section class="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h3 class="font-semibold text-indigo-950">{t('dashboard.phaseCompleteTitle')}</h3>
				<p class="mt-1 text-sm text-indigo-900/70">
					{t('dashboard.phaseCompleteBody')}
				</p>
			</div>
			<a
				href={resolve('/(app)/projects')}
				class="inline-flex items-center gap-2 self-start rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
			>
				{t('dashboard.openProjects')}
				<ArrowRight class="h-4 w-4 rtl:-scale-x-100" />
			</a>
		</div>
	</section>
</div>
