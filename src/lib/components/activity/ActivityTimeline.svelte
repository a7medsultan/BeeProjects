<script lang="ts">
	import { describeActivity } from '#lib/activity.ts';
	import { formatDateTime } from '#lib/format.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import type { ActivityItem } from '#lib/types.ts';

	interface Props {
		items: ActivityItem[];
		timezone?: string;
		emptyMessage?: string;
	}

	let { items, timezone = 'UTC', emptyMessage }: Props = $props();

	const { t, locale } = useI18n();
</script>

{#if items.length === 0}
	<div class="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
		<p class="text-sm text-slate-500">{emptyMessage ?? t('activity.empty')}</p>
	</div>
{:else}
	<ol class="space-y-4">
		{#each items as item (item.id)}
			<li class="flex gap-3">
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
				>
					{item.actorName.slice(0, 1).toUpperCase()}
				</div>
				<div class="min-w-0 pt-0.5">
					<p dir="auto" class="user-text text-sm leading-5 text-slate-700">
						{describeActivity(item, t)}
					</p>
					<p class="mt-0.5 text-xs text-slate-400">
						{formatDateTime(item.createdAt, timezone, locale)}
					</p>
				</div>
			</li>
		{/each}
	</ol>
{/if}
