<script lang="ts">
	import { resolve } from '$app/paths';
	import ActivityTimeline from '#lib/components/activity/ActivityTimeline.svelte';
	import { useI18n } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const { t } = useI18n();
	const timezone = $derived(data.user?.timezone ?? 'UTC');
</script>

<svelte:head>
	<title>{t('projects.activity.pageTitle', { project: data.project.name })}</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold tracking-tight text-slate-900">
			{t('projects.activity.title')}
		</h2>
		<p class="mt-1 text-sm text-slate-500">{t('projects.activity.subtitle')}</p>
	</div>

	<div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
		<ActivityTimeline
			items={data.activity.items}
			{timezone}
			emptyMessage={t('projects.activity.emptyPage')}
		/>
	</div>

	{#if data.activity.totalPages > 1}
		<div
			class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
		>
			<p class="text-xs text-slate-500">
				{t('projects.activity.showing', {
					from: (data.activity.page - 1) * data.activity.pageSize + 1,
					to: Math.min(data.activity.page * data.activity.pageSize, data.activity.total),
					total: data.activity.total
				})}
			</p>
			<div class="flex items-center gap-2">
				{#if data.activity.page > 1}
					<a
						href={resolve(`/(app)/projects/[id]/activity?page=${data.activity.page - 1}`, {
							id: data.project.id
						})}
						class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
					>
						{t('common.previous')}
					</a>
				{/if}
				<span class="text-xs text-slate-500">
					{t('common.pageOf', {
						page: data.activity.page,
						total: data.activity.totalPages
					})}
				</span>
				{#if data.activity.page < data.activity.totalPages}
					<a
						href={resolve(`/(app)/projects/[id]/activity?page=${data.activity.page + 1}`, {
							id: data.project.id
						})}
						class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
					>
						{t('common.next')}
					</a>
				{/if}
			</div>
		</div>
	{/if}
</div>
