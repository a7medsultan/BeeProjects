<script lang="ts">
	import { resolve } from '$app/paths';
	import { CalendarClock, CheckCircle2, CircleAlert, ListTodo, Users } from '@lucide/svelte';
	import ActivityTimeline from '#lib/components/activity/ActivityTimeline.svelte';
	import { formatDate, formatDateTime } from '#lib/format.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import { ROLE_KEYS } from '#lib/i18n/labels.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const { t, locale } = useI18n();

	const stats = $derived([
		{
			label: t('projects.detail.totalTasks'),
			value: data.project.totalTasks,
			icon: ListTodo,
			tone: 'text-sky-600 bg-sky-50'
		},
		{
			label: t('projects.detail.completed'),
			value: data.project.completedTasks,
			icon: CheckCircle2,
			tone: 'text-emerald-600 bg-emerald-50'
		},
		{
			label: t('projects.detail.overdue'),
			value: data.project.overdueTasks,
			icon: CircleAlert,
			tone: 'text-rose-600 bg-rose-50'
		},
		{
			label: t('projects.detail.progressLabel'),
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
			<h2 class="font-semibold text-slate-900">{t('projects.detail.aboutTitle')}</h2>
			<p dir="auto" class="user-text mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-600">
				{data.project.description || t('projects.detail.noDescriptionLong')}
			</p>

			<dl class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="rounded-lg bg-slate-50 p-3">
					<dt class="text-xs font-medium tracking-wide text-slate-400 uppercase">
						{t('projects.detail.startDate')}
					</dt>
					<dd class="mt-1 text-sm text-slate-800">
						{data.project.startDate
							? formatDate(data.project.startDate, locale)
							: t('common.notSet')}
					</dd>
				</div>
				<div class="rounded-lg bg-slate-50 p-3">
					<dt class="text-xs font-medium tracking-wide text-slate-400 uppercase">
						{t('projects.detail.dueDate')}
					</dt>
					<dd class="mt-1 text-sm text-slate-800">
						{data.project.dueDate ? formatDate(data.project.dueDate, locale) : t('common.notSet')}
					</dd>
				</div>
				<div class="rounded-lg bg-slate-50 p-3">
					<dt class="text-xs font-medium tracking-wide text-slate-400 uppercase">
						{t('projects.detail.owner')}
					</dt>
					<dd dir="auto" class="user-text mt-1 text-sm text-slate-800">
						{data.project.ownerName}
					</dd>
				</div>
				<div class="rounded-lg bg-slate-50 p-3">
					<dt class="text-xs font-medium tracking-wide text-slate-400 uppercase">
						{t('projects.detail.updated')}
					</dt>
					<dd class="mt-1 text-sm text-slate-800">
						{formatDateTime(data.project.updatedAt, timezone, locale)}
					</dd>
				</div>
			</dl>
		</section>

		<section class="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
			<ListTodo class="mx-auto h-9 w-9 text-slate-300" />
			<h3 class="mt-3 font-semibold text-slate-900">
				{t('projects.detail.taskManagementTitle')}
			</h3>
			<p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
				{t('projects.detail.taskManagementBody')}
			</p>
			<div class="mt-4 flex flex-wrap items-center justify-center gap-3">
				<a
					href={resolve('/(app)/projects/[id]/list', { id: data.project.id })}
					class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
				>
					{t('projects.detail.openTaskList')}
				</a>
				{#if data.permissions.canManage}
					<a
						href={resolve('/(app)/projects/[id]/tasks/new', { id: data.project.id })}
						class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
					>
						{t('projects.detail.newTask')}
					</a>
					<a
						href={resolve('/(app)/projects/[id]/members', { id: data.project.id })}
						class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
					>
						{t('projects.detail.manageMembers')}
					</a>
				{/if}
				<a
					href={resolve('/(app)/projects/[id]/activity', { id: data.project.id })}
					class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
				>
					{t('projects.detail.viewActivity')}
				</a>
			</div>
		</section>
	</div>

	<div class="space-y-6">
		<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<h2 class="font-semibold text-slate-900">{t('projects.detail.members')}</h2>
				<a
					href={resolve('/(app)/projects/[id]/members', { id: data.project.id })}
					class="text-sm font-medium text-indigo-600 hover:text-indigo-700"
				>
					{t('common.viewAll')}
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
							<p dir="auto" class="user-text truncate text-sm font-medium text-slate-800">
								{member.name}
							</p>
							<p class="truncate text-xs text-slate-500">
								{t(ROLE_KEYS[member.role])}{member.isActive ? '' : ` · ${t('common.inactive')}`}
							</p>
						</div>
						{#if member.isOwner}
							<span
								class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
							>
								{t('projects.members.ownerBadge')}
							</span>
						{/if}
					</li>
				{:else}
					<li class="flex items-center gap-2 text-sm text-slate-500">
						<Users class="h-4 w-4 text-slate-400" />
						{t('projects.detail.noMembers')}
					</li>
				{/each}
			</ul>
		</section>

		<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<h2 class="font-semibold text-slate-900">{t('projects.detail.recentActivity')}</h2>
				<a
					href={resolve('/(app)/projects/[id]/activity', { id: data.project.id })}
					class="text-sm font-medium text-indigo-600 hover:text-indigo-700"
				>
					{t('common.viewAll')}
				</a>
			</div>
			<div class="mt-4">
				<ActivityTimeline
					items={data.recentActivity}
					{timezone}
					emptyMessage={t('projects.detail.activityEmpty')}
				/>
			</div>
		</section>
	</div>
</div>
