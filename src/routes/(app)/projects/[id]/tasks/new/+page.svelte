<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft, Plus } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import {
		TASK_PRIORITIES,
		TASK_PRIORITY_LABELS,
		TASK_STATUSES,
		TASK_STATUS_LABELS
	} from '#lib/constants.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const { form, errors, message, enhance, submitting } = superForm(
		untrack(() => data.form),
		{ taintedMessage: false }
	);

	const backHref = $derived(
		data.parent
			? resolve('/(app)/tasks/[id]', { id: data.parent.id })
			: resolve('/(app)/projects/[id]/list', { id: data.project.id })
	);
</script>

<svelte:head>
	<title>{data.parent ? 'New subtask' : 'New task'} · {data.project.name} · BeeProjects</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<a
		href={backHref}
		class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
	>
		<ArrowLeft class="h-4 w-4" />
		{data.parent ? 'Back to parent task' : 'Back to task list'}
	</a>

	<div>
		<h2 class="text-2xl font-semibold tracking-tight text-slate-900">
			{data.parent ? 'Create subtask' : 'Create task'}
		</h2>
		<p class="mt-1 text-sm text-slate-500">
			{#if data.parent}
				Under <span class="font-medium text-slate-700">{data.parent.title}</span>
			{:else}
				Add a task to <span class="font-medium text-slate-700">{data.project.name}</span>
			{/if}
		</p>
	</div>

	{#if $message}
		<p
			class={[
				'rounded-xl border px-4 py-3 text-sm',
				$message.type === 'error'
					? 'border-rose-200 bg-rose-50 text-rose-800'
					: $message.type === 'warning'
						? 'border-amber-200 bg-amber-50 text-amber-800'
						: 'border-emerald-200 bg-emerald-50 text-emerald-800'
			]}
			role="status"
		>
			{$message.text}
		</p>
	{/if}

	<form
		method="POST"
		action="?/create"
		use:enhance
		class="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
	>
		<input type="hidden" name="parentTaskId" bind:value={$form.parentTaskId} />

		<div>
			<label for="title" class="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
			<input
				id="title"
				name="title"
				type="text"
				bind:value={$form.title}
				aria-invalid={$errors.title ? 'true' : undefined}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			/>
			{#if $errors.title}
				<p class="mt-1.5 text-sm text-rose-600">{$errors.title[0]}</p>
			{/if}
		</div>

		<div>
			<label for="description" class="mb-1.5 block text-sm font-medium text-slate-700">
				Description
			</label>
			<textarea
				id="description"
				name="description"
				rows="4"
				bind:value={$form.description}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			></textarea>
			{#if $errors.description}
				<p class="mt-1.5 text-sm text-rose-600">{$errors.description[0]}</p>
			{/if}
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div>
				<label for="status" class="mb-1.5 block text-sm font-medium text-slate-700"> Status </label>
				<select
					id="status"
					name="status"
					bind:value={$form.status}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				>
					{#each TASK_STATUSES as status (status)}
						<option value={status}>{TASK_STATUS_LABELS[status]}</option>
					{/each}
				</select>
				{#if $errors.status}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.status[0]}</p>
				{/if}
			</div>

			<div>
				<label for="priority" class="mb-1.5 block text-sm font-medium text-slate-700">
					Priority
				</label>
				<select
					id="priority"
					name="priority"
					bind:value={$form.priority}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				>
					{#each TASK_PRIORITIES as priority (priority)}
						<option value={priority}>{TASK_PRIORITY_LABELS[priority]}</option>
					{/each}
				</select>
				{#if $errors.priority}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.priority[0]}</p>
				{/if}
			</div>

			<div>
				<label for="startDate" class="mb-1.5 block text-sm font-medium text-slate-700">
					Start date
				</label>
				<input
					id="startDate"
					name="startDate"
					type="date"
					bind:value={$form.startDate}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				/>
				{#if $errors.startDate}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.startDate[0]}</p>
				{/if}
			</div>

			<div>
				<label for="dueDate" class="mb-1.5 block text-sm font-medium text-slate-700">
					Due date
				</label>
				<input
					id="dueDate"
					name="dueDate"
					type="date"
					bind:value={$form.dueDate}
					aria-invalid={$errors.dueDate ? 'true' : undefined}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				/>
				{#if $errors.dueDate}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.dueDate[0]}</p>
				{/if}
			</div>
		</div>

		<div>
			<p class="mb-2 block text-sm font-medium text-slate-700">Assignees</p>
			{#if data.members.length > 0}
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{#each data.members as member (member.userId)}
						<label
							class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
						>
							<input
								type="checkbox"
								name="assigneeIds"
								value={member.userId}
								bind:group={$form.assigneeIds}
								class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<span class="min-w-0 truncate">{member.name}</span>
							{#if member.isOwner}
								<span
									class="ml-auto rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
								>
									Owner
								</span>
							{/if}
						</label>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-slate-500">No active project members to assign.</p>
			{/if}
			{#if $errors.assigneeIds}
				<p class="mt-1.5 text-sm text-rose-600">{$errors.assigneeIds[0]}</p>
			{/if}
		</div>

		<div class="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
			<a
				href={backHref}
				class="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={$submitting}
				class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				<Plus class="h-4 w-4" />
				{$submitting ? 'Creating…' : data.parent ? 'Create subtask' : 'Create task'}
			</button>
		</div>
	</form>
</div>
