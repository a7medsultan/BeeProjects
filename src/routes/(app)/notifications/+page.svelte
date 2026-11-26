<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		AlertTriangle,
		AtSign,
		Bell,
		CalendarClock,
		Check,
		MessageSquare,
		UserPlus
	} from '@lucide/svelte';
	import { formatDateTime } from '#lib/format.ts';
	import { notificationBody, notificationTitle } from '#lib/i18n/content.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import type { NotificationType } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const { t, locale } = useI18n();

	const notice = $derived(form && 'notice' in form ? form.notice : undefined);
	const actionError = $derived(form && 'error' in form ? form.error : undefined);
	const timezone = $derived(data.user?.timezone ?? 'UTC');

	function iconFor(type: NotificationType) {
		switch (type) {
			case 'task_assigned':
			case 'task_reassigned':
				return UserPlus;
			case 'comment_added':
				return MessageSquare;
			case 'mention':
				return AtSign;
			case 'due_soon':
				return CalendarClock;
			case 'overdue':
				return AlertTriangle;
			default:
				return Bell;
		}
	}

	function pageQuery(page: number): string {
		const params: string[] = [];
		if (data.unreadOnly) params.push('filter=unread');
		params.push(`page=${page}`);
		return params.join('&');
	}
</script>

<svelte:head>
	<title>{t('notifications.pageTitle')}</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight text-slate-900">
				{t('notifications.title')}
			</h2>
			<p class="mt-1 text-sm text-slate-500">{t('notifications.subtitle')}</p>
		</div>
		{#if data.unreadCount > 0}
			<form method="POST" action="?/markAllRead">
				<button
					type="submit"
					class="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 sm:self-auto"
				>
					<Check class="h-4 w-4" />
					{t('notifications.markAllRead')}
				</button>
			</form>
		{/if}
	</div>

	{#if notice}
		<p
			class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
			role="status"
		>
			{notice}
		</p>
	{/if}

	{#if actionError}
		<p
			class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
			role="alert"
		>
			{actionError}
		</p>
	{/if}

	<div class="flex items-center gap-1 border-b border-slate-200">
		<a
			href={resolve('/(app)/notifications')}
			class={[
				'-mb-px border-b-2 px-3 py-2 text-sm font-medium transition',
				data.unreadOnly
					? 'border-transparent text-slate-500 hover:text-slate-700'
					: 'border-indigo-600 text-indigo-700'
			]}
			aria-current={data.unreadOnly ? undefined : 'page'}
		>
			{t('notifications.all')}
		</a>
		<a
			href={resolve('/(app)/notifications?filter=unread')}
			class={[
				'-mb-px border-b-2 px-3 py-2 text-sm font-medium transition',
				data.unreadOnly
					? 'border-indigo-600 text-indigo-700'
					: 'border-transparent text-slate-500 hover:text-slate-700'
			]}
			aria-current={data.unreadOnly ? 'page' : undefined}
		>
			{t('notifications.unread')}
			{#if data.unreadCount > 0}
				<span class="ms-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[11px] text-rose-700">
					{data.unreadCount}
				</span>
			{/if}
		</a>
	</div>

	{#if data.items.length === 0}
		<div class="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
			<Bell class="mx-auto h-10 w-10 text-slate-300" />
			<h3 class="mt-4 font-semibold text-slate-900">
				{data.unreadOnly ? t('notifications.noUnread') : t('notifications.empty')}
			</h3>
			<p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
				{t('notifications.emptyHint')}
			</p>
		</div>
	{:else}
		<ul class="space-y-2">
			{#each data.items as notification (notification.id)}
				{@const Icon = iconFor(notification.type)}
				<li
					class={[
						'flex items-start gap-2 rounded-xl border px-4 py-3 shadow-sm transition',
						notification.isRead ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50/40'
					]}
				>
					<form method="POST" action="?/open" class="min-w-0 flex-1">
						<input type="hidden" name="notificationId" value={notification.id} />
						<button type="submit" class="flex w-full items-start gap-3 text-start">
							<span class="mt-0.5 rounded-lg bg-white p-2 text-slate-500 shadow-sm">
								<Icon class="h-4 w-4" />
							</span>
							<span class="min-w-0 flex-1">
								<span class="flex flex-wrap items-center gap-2">
									<span dir="auto" class="user-text text-sm font-medium text-slate-900">
										{notificationTitle(notification, t)}
									</span>
									{#if !notification.isRead}
										<span class="h-2 w-2 rounded-full bg-indigo-500"></span>
									{/if}
								</span>
								{#if notificationBody(notification, t)}
									<span dir="auto" class="user-text mt-0.5 block text-sm text-slate-600">
										{notificationBody(notification, t)}
									</span>
								{/if}
								<span class="mt-1 block text-[11px] text-slate-400">
									{formatDateTime(notification.createdAt, timezone, locale)}
								</span>
							</span>
						</button>
					</form>

					{#if !notification.isRead}
						<form method="POST" action="?/markRead" class="shrink-0">
							<input type="hidden" name="notificationId" value={notification.id} />
							<button
								type="submit"
								aria-label={t('notifications.markReadAria')}
								class="rounded p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
							>
								<Check class="h-4 w-4" />
							</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>

		{#if data.totalPages > 1}
			<div
				class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
			>
				<p class="text-xs text-slate-500">
					{t('common.showingNotifications', {
						from: (data.page - 1) * data.pageSize + 1,
						to: Math.min(data.page * data.pageSize, data.total),
						total: data.total
					})}
				</p>
				<div class="flex items-center gap-2">
					{#if data.page > 1}
						<a
							href={resolve(`/(app)/notifications?${pageQuery(data.page - 1)}`)}
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
							href={resolve(`/(app)/notifications?${pageQuery(data.page + 1)}`)}
							class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
						>
							{t('common.next')}
						</a>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>
