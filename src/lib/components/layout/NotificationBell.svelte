<script lang="ts">
	import { resolve } from '$app/paths';
	import { Bell } from '@lucide/svelte';
	import { onMount, untrack } from 'svelte';
	import { formatDateTime } from '#lib/format.ts';
	import type { NotificationItem } from '#lib/types.ts';

	interface Props {
		initialCount: number;
		recent: NotificationItem[];
		timezone: string;
	}

	let { initialCount, recent, timezone }: Props = $props();

	let unread = $state(untrack(() => initialCount));
	let open = $state(false);

	onMount(() => {
		let active = true;

		async function refresh(): Promise<void> {
			try {
				const response = await fetch('/api/notifications/unread-count');

				if (!response.ok) return;

				const data = (await response.json()) as { count?: number };

				if (active && typeof data.count === 'number') {
					unread = data.count;
				}
			} catch {
				// Keep the last known count when polling fails.
			}
		}

		const interval = setInterval(refresh, 30_000);

		const onFocus = () => {
			void refresh();
		};

		const onVisibility = () => {
			if (document.visibilityState === 'visible') {
				void refresh();
			}
		};

		window.addEventListener('focus', onFocus);
		document.addEventListener('visibilitychange', onVisibility);

		return () => {
			active = false;
			clearInterval(interval);
			window.removeEventListener('focus', onFocus);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	});
</script>

<div class="relative">
	<button
		type="button"
		class="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
		aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<Bell class="h-5 w-5" />
		{#if unread > 0}
			<span
				class="absolute -top-0.5 -right-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white"
			>
				{unread > 9 ? '9+' : unread}
			</span>
		{/if}
	</button>

	{#if open}
		<button
			type="button"
			class="fixed inset-0 z-30 cursor-default"
			aria-label="Close notifications"
			onclick={() => (open = false)}
		></button>

		<div
			class="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
		>
			<div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
				<p class="text-sm font-semibold text-slate-900">Notifications</p>
				<span class="text-xs text-slate-500">{unread} unread</span>
			</div>

			{#if recent.length === 0}
				<p class="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</p>
			{:else}
				<ul class="max-h-96 divide-y divide-slate-100 overflow-y-auto">
					{#each recent as notification (notification.id)}
						<li>
							<form method="POST" action={resolve('/(app)/notifications') + '?/open'} class="block">
								<input type="hidden" name="notificationId" value={notification.id} />
								<button
									type="submit"
									class="flex w-full items-start gap-2 px-4 py-3 text-left transition hover:bg-slate-50"
								>
									<span
										class={[
											'mt-1.5 h-2 w-2 shrink-0 rounded-full',
											notification.isRead ? 'bg-transparent' : 'bg-indigo-500'
										]}
									></span>
									<span class="min-w-0">
										<span class="block truncate text-sm font-medium text-slate-800">
											{notification.title}
										</span>
										{#if notification.body}
											<span class="mt-0.5 block truncate text-xs text-slate-500">
												{notification.body}
											</span>
										{/if}
										<span class="mt-0.5 block text-[11px] text-slate-400">
											{formatDateTime(notification.createdAt, timezone)}
										</span>
									</span>
								</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="flex items-center justify-between border-t border-slate-100 px-4 py-2">
				<a
					href={resolve('/(app)/notifications')}
					class="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
					onclick={() => (open = false)}
				>
					View all notifications
				</a>
				{#if unread > 0}
					<form method="POST" action={resolve('/(app)/notifications') + '?/markAllRead'}>
						<button
							type="submit"
							class="text-xs font-medium text-slate-500 transition hover:text-slate-700"
						>
							Mark all read
						</button>
					</form>
				{/if}
			</div>
		</div>
	{/if}
</div>
