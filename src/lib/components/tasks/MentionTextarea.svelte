<script lang="ts">
	import { tick } from 'svelte';
	import { buildMentionToken, mentionQueryAt } from '#lib/mentions.ts';

	interface Member {
		userId: string;
		name: string;
		email: string;
	}

	interface Props {
		id?: string;
		name?: string;
		value?: string;
		members: Member[];
		placeholder?: string;
		rows?: number;
	}

	let {
		id = undefined,
		name = 'body',
		value = $bindable(''),
		members,
		placeholder = 'Write a comment…',
		rows = 4
	}: Props = $props();

	let textarea = $state<HTMLTextAreaElement | null>(null);
	let query = $state<{ query: string; start: number } | null>(null);

	const filtered = $derived.by(() => {
		const current = query;
		if (!current) return [];

		return members
			.filter(
				(member) =>
					member.name.toLowerCase().includes(current.query.toLowerCase()) ||
					member.email.toLowerCase().includes(current.query.toLowerCase())
			)
			.slice(0, 6);
	});

	function handleInput(event: Event & { currentTarget: HTMLTextAreaElement }): void {
		const element = event.currentTarget;
		const cursor = element.selectionStart ?? element.value.length;
		query = mentionQueryAt(element.value.slice(0, cursor));
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			query = null;
		}
	}

	async function selectMember(member: Member): Promise<void> {
		if (!query) return;

		const cursor = textarea?.selectionStart ?? value.length;
		const token = buildMentionToken(member.name, member.userId);
		const nextCursor = query.start + token.length;

		value = value.slice(0, query.start) + token + value.slice(cursor);
		query = null;

		await tick();
		textarea?.focus();
		textarea?.setSelectionRange(nextCursor, nextCursor);
	}
</script>

<div class="relative">
	<textarea
		{id}
		{name}
		{rows}
		{placeholder}
		bind:this={textarea}
		bind:value
		oninput={handleInput}
		onkeydown={handleKeydown}
		onblur={() => (query = null)}
		class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
	></textarea>

	{#if query && filtered.length > 0}
		<div
			class="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
			role="listbox"
			aria-label="Mention a project member"
		>
			{#each filtered as member (member.userId)}
				<button
					type="button"
					class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-indigo-50"
					onmousedown={(event) => event.preventDefault()}
					onclick={() => selectMember(member)}
				>
					<span class="truncate font-medium text-slate-800">{member.name}</span>
					<span class="truncate text-xs text-slate-400">{member.email}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
