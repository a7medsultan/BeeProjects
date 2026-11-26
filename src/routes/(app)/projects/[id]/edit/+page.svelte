<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { PROJECT_OPEN_STATUSES, PROJECT_PRIORITIES } from '#lib/constants.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import { PROJECT_PRIORITY_KEYS, PROJECT_STATUS_KEYS } from '#lib/i18n/labels.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const { t } = useI18n();

	const { form, errors, message, enhance, submitting } = superForm(
		untrack(() => data.form),
		{ taintedMessage: false }
	);
</script>

<svelte:head>
	<title>{t('projects.form.pageTitleEdit', { project: data.project.name })}</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
	<a
		href={resolve('/(app)/projects/[id]', { id: data.project.id })}
		class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
	>
		<ArrowLeft class="h-4 w-4 rtl:-scale-x-100" />
		{t('projects.form.backToProject')}
	</a>

	<div>
		<h2 class="text-2xl font-semibold tracking-tight text-slate-900">
			{t('projects.form.editTitle')}
		</h2>
		<p class="mt-1 text-sm text-slate-500">{t('projects.form.editSubtitle')}</p>
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
		action="?/update"
		use:enhance
		class="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
	>
		<div>
			<label for="name" class="mb-1.5 block text-sm font-medium text-slate-700">
				{t('projects.form.name')}
			</label>
			<input
				id="name"
				name="name"
				type="text"
				dir="auto"
				bind:value={$form.name}
				aria-invalid={$errors.name ? 'true' : undefined}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			/>
			{#if $errors.name}
				<p class="mt-1.5 text-sm text-rose-600">{$errors.name[0]}</p>
			{/if}
		</div>

		<div>
			<label for="description" class="mb-1.5 block text-sm font-medium text-slate-700">
				{t('projects.form.description')}
			</label>
			<textarea
				id="description"
				name="description"
				rows="4"
				dir="auto"
				bind:value={$form.description}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			></textarea>
			{#if $errors.description}
				<p class="mt-1.5 text-sm text-rose-600">{$errors.description[0]}</p>
			{/if}
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div>
				<label for="startDate" class="mb-1.5 block text-sm font-medium text-slate-700">
					{t('projects.form.startDate')}
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
					{t('projects.form.dueDate')}
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

			<div>
				<label for="priority" class="mb-1.5 block text-sm font-medium text-slate-700">
					{t('projects.form.priority')}
				</label>
				<select
					id="priority"
					name="priority"
					bind:value={$form.priority}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				>
					{#each PROJECT_PRIORITIES as priority (priority)}
						<option value={priority}>{t(PROJECT_PRIORITY_KEYS[priority])}</option>
					{/each}
				</select>
				{#if $errors.priority}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.priority[0]}</p>
				{/if}
			</div>

			<div>
				<label for="status" class="mb-1.5 block text-sm font-medium text-slate-700"
					>{t('projects.form.status')}</label
				>
				<select
					id="status"
					name="status"
					bind:value={$form.status}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				>
					{#each PROJECT_OPEN_STATUSES as status (status)}
						<option value={status}>{t(PROJECT_STATUS_KEYS[status])}</option>
					{/each}
				</select>
				{#if $errors.status}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.status[0]}</p>
				{/if}
			</div>
		</div>

		{#if data.permissions.isAdmin}
			<div>
				<label for="ownerId" class="mb-1.5 block text-sm font-medium text-slate-700"
					>{t('projects.form.owner')}</label
				>
				<select
					id="ownerId"
					name="ownerId"
					bind:value={$form.ownerId}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				>
					{#each data.ownerCandidates as owner (owner.id)}
						<option value={owner.id}>{owner.name}</option>
					{/each}
				</select>
				{#if $errors.ownerId}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.ownerId[0]}</p>
				{/if}
				<p class="mt-1.5 text-xs text-slate-500">{t('projects.form.ownerChangeHelp')}</p>
			</div>
		{:else}
			<p class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
				{t('projects.form.ownerOnlyAdmin', { name: data.project.ownerName })}
			</p>
		{/if}

		<div class="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
			<a
				href={resolve('/(app)/projects/[id]', { id: data.project.id })}
				class="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
			>
				{t('common.cancel')}
			</a>
			<button
				type="submit"
				disabled={$submitting}
				class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{$submitting ? t('common.saving') : t('common.saveChanges')}
			</button>
		</div>
	</form>
</div>
