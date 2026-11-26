<script lang="ts">
	import { parseMentions } from '#lib/mentions.ts';

	interface Props {
		body: string;
	}

	let { body }: Props = $props();

	const segments = $derived(parseMentions(body));
</script>

<p dir="auto" class="user-text text-sm leading-6 break-words whitespace-pre-wrap text-slate-700">
	{#each segments as segment, index (index)}
		{#if segment.type === 'mention'}
			<span class="rounded bg-indigo-50 px-1 py-0.5 font-medium text-indigo-700">
				@{segment.text}
			</span>
		{:else}
			{segment.text}
		{/if}
	{/each}
</p>
