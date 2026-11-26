<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft, Check, Copy, UserPlus } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { useI18n } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const { t } = useI18n();

	const { form, errors, message, enhance, submitting } = superForm(
		untrack(() => data.form),
		{
			taintedMessage: false
		}
	);

	let copied = $state(false);

	async function copyPassword(): Promise<void> {
		const password = $message?.tempPassword;
		if (!password) return;

		try {
			await navigator.clipboard.writeText(password);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			copied = false;
		}
	}
</script>

<svelte:head>
	<title>{t('admin.users.new.pageTitle')}</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<a
		href={resolve('/(app)/admin/users')}
		class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
	>
		<ArrowLeft class="h-4 w-4 rtl:-scale-x-100" />
		{t('admin.users.new.back')}
	</a>

	<div>
		<h2 class="text-2xl font-semibold tracking-tight text-slate-900">
			{t('admin.users.new.heading')}
		</h2>
		<p class="mt-1 text-sm text-slate-500">{t('admin.users.new.subtitle')}</p>
	</div>

	{#if $message}
		<div
			class={[
				'rounded-xl border p-4',
				$message.type === 'error'
					? 'border-rose-200 bg-rose-50'
					: $message.type === 'warning'
						? 'border-amber-200 bg-amber-50'
						: 'border-emerald-200 bg-emerald-50'
			]}
			role="status"
		>
			<p
				class={[
					'text-sm font-medium',
					$message.type === 'error'
						? 'text-rose-900'
						: $message.type === 'warning'
							? 'text-amber-900'
							: 'text-emerald-900'
				]}
			>
				{$message.text}
			</p>

			{#if $message.tempPassword}
				<div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
					<code
						dir="ltr"
						class="ltr-text flex-1 rounded-lg bg-white/80 px-3 py-2 font-mono text-sm text-slate-900"
					>
						{$message.tempPassword}
					</code>
					<button
						type="button"
						onclick={copyPassword}
						class="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
					>
						{#if copied}
							<Check class="h-4 w-4" />
							{t('admin.users.new.copied')}
						{:else}
							<Copy class="h-4 w-4" />
							{t('admin.users.new.copy')}
						{/if}
					</button>
				</div>
				<p class="mt-2 text-xs text-emerald-800">{t('admin.users.new.passwordOnce')}</p>
			{/if}
		</div>
	{/if}

	<form
		method="POST"
		action="?/create"
		use:enhance
		class="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
	>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div>
				<label for="name" class="mb-1.5 block text-sm font-medium text-slate-700">
					{t('profile.name')}
				</label>
				<input
					id="name"
					name="name"
					type="text"
					dir="auto"
					autocomplete="name"
					bind:value={$form.name}
					aria-invalid={$errors.name ? 'true' : undefined}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				/>
				{#if $errors.name}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.name[0]}</p>
				{/if}
			</div>

			<div>
				<label for="email" class="mb-1.5 block text-sm font-medium text-slate-700">
					{t('profile.email')}
				</label>
				<input
					id="email"
					name="email"
					type="email"
					dir="ltr"
					autocomplete="email"
					bind:value={$form.email}
					aria-invalid={$errors.email ? 'true' : undefined}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				/>
				{#if $errors.email}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.email[0]}</p>
				{/if}
			</div>

			<div>
				<label for="role" class="mb-1.5 block text-sm font-medium text-slate-700">
					{t('profile.role')}
				</label>
				<select
					id="role"
					name="role"
					bind:value={$form.role}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				>
					<option value="member">{t('enum.role.member')}</option>
					<option value="project_manager">{t('enum.role.project_manager')}</option>
					<option value="admin">{t('enum.role.admin')}</option>
				</select>
				{#if $errors.role}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.role[0]}</p>
				{/if}
			</div>

			<div>
				<label for="timezone" class="mb-1.5 block text-sm font-medium text-slate-700">
					{t('profile.timezone')}
				</label>
				<select
					id="timezone"
					name="timezone"
					bind:value={$form.timezone}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				>
					{#each data.timezones as timezone (timezone)}
						<option value={timezone}>{timezone}</option>
					{/each}
				</select>
				{#if $errors.timezone}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.timezone[0]}</p>
				{/if}
			</div>
		</div>

		<div class="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
			<a
				href={resolve('/(app)/admin/users')}
				class="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
			>
				{t('common.cancel')}
			</a>
			<button
				type="submit"
				disabled={$submitting}
				class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				<UserPlus class="h-4 w-4" />
				{$submitting ? t('common.creating') : t('admin.users.new.create')}
			</button>
		</div>
	</form>
</div>
