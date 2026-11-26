<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft, Check, Copy, KeyRound, ShieldAlert, UserCheck, UserX } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { formatDateTime } from '#lib/format.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import { ROLE_KEYS } from '#lib/i18n/labels.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const { t, locale } = useI18n();

	const {
		form: editForm,
		errors,
		message,
		enhance,
		submitting
	} = superForm(
		untrack(() => data.form),
		{
			taintedMessage: false
		}
	);

	let copied = $state(false);

	const actionNotice = $derived(form && 'notice' in form ? form.notice : undefined);
	const actionError = $derived(form && 'error' in form ? form.error : undefined);
	const resetPassword = $derived(form && 'resetPassword' in form ? form.resetPassword : undefined);
	const resetEmail = $derived(form && 'resetEmail' in form ? form.resetEmail : undefined);

	const isSelf = $derived(data.user?.id === data.managedUser.id);
	const isOnlyActiveAdmin = $derived(
		data.managedUser.role === 'admin' && data.managedUser.isActive && data.activeAdminCount <= 1
	);
	const hasOwnedProjects = $derived(data.managedUser.ownedProjects > 0);
	const canDeactivate = $derived(!isSelf && !isOnlyActiveAdmin && !hasOwnedProjects);
	const canReset = $derived(!isSelf);
	const timezone = $derived(data.user?.timezone ?? 'UTC');

	async function copyTempPassword(): Promise<void> {
		if (!resetPassword) return;

		try {
			await navigator.clipboard.writeText(resetPassword);
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
	<title>{t('admin.users.edit.pageTitle', { name: data.managedUser.name })}</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6">
	<a
		href={resolve('/(app)/admin/users')}
		class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
	>
		<ArrowLeft class="h-4 w-4 rtl:-scale-x-100" />
		{t('admin.users.edit.back')}
	</a>

	<div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="flex items-center gap-4">
				<div
					class="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-semibold text-indigo-700"
				>
					{data.managedUser.name.slice(0, 1).toUpperCase()}
				</div>
				<div class="min-w-0">
					<h2 class="truncate text-xl font-semibold tracking-tight text-slate-900">
						{data.managedUser.name}
					</h2>
					<p class="truncate text-sm text-slate-500">{data.managedUser.email}</p>
					<div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
						<span class="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
							{t(ROLE_KEYS[data.managedUser.role])}
						</span>
						<span
							class={[
								'rounded-full px-2 py-0.5 font-medium',
								data.managedUser.isActive
									? 'bg-emerald-50 text-emerald-700'
									: 'bg-slate-100 text-slate-600'
							]}
						>
							{data.managedUser.isActive ? t('common.active') : t('common.inactive')}
						</span>
						{#if data.managedUser.mustChangePassword}
							<span class="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
								{t('admin.users.tempPasswordBadge')}
							</span>
						{/if}
						{#if isSelf}
							<span class="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
								{t('admin.users.edit.yourAccount')}
							</span>
						{/if}
					</div>
				</div>
			</div>

			<dl class="grid grid-cols-2 gap-3 text-sm">
				<div>
					<dt class="text-xs tracking-wide text-slate-400 uppercase">
						{t('admin.users.edit.projects')}
					</dt>
					<dd class="mt-0.5 font-medium text-slate-800">{data.managedUser.ownedProjects}</dd>
				</div>
				<div>
					<dt class="text-xs tracking-wide text-slate-400 uppercase">
						{t('admin.users.edit.lastLoginLabel')}
					</dt>
					<dd class="mt-0.5 font-medium text-slate-800">
						{formatDateTime(data.managedUser.lastLoginAt, timezone, locale)}
					</dd>
				</div>
			</dl>
		</div>
	</div>

	{#if actionNotice}
		<p
			class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
			role="status"
		>
			{actionNotice}
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

	{#if resetPassword}
		<div class="rounded-xl border border-amber-200 bg-amber-50 p-4" role="status">
			<p class="text-sm font-semibold text-amber-900">
				{t('admin.users.edit.resetTempFor', { email: resetEmail })}
			</p>
			<div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
				<code
					dir="ltr"
					class="ltr-text flex-1 rounded-lg bg-white/80 px-3 py-2 font-mono text-sm text-slate-900"
				>
					{resetPassword}
				</code>
				<button
					type="button"
					onclick={copyTempPassword}
					class="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
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
			<p class="mt-2 text-xs text-amber-800">
				{t('admin.users.edit.shownOnce')}
			</p>
		</div>
	{/if}

	<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<h3 class="font-semibold text-slate-900">{t('admin.users.edit.accountDetails')}</h3>
		<p class="mt-1 text-sm text-slate-500">{t('admin.users.edit.accountDetailsHelp')}</p>

		{#if $message}
			<p
				class={[
					'mt-4 rounded-lg px-3 py-2 text-sm',
					$message.type === 'error'
						? 'bg-rose-50 text-rose-800'
						: $message.type === 'warning'
							? 'bg-amber-50 text-amber-800'
							: 'bg-emerald-50 text-emerald-800'
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
			class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
		>
			<div>
				<label for="name" class="mb-1.5 block text-sm font-medium text-slate-700"
					>{t('profile.name')}</label
				>
				<input
					id="name"
					name="name"
					type="text"
					dir="auto"
					bind:value={$editForm.name}
					aria-invalid={$errors.name ? 'true' : undefined}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				/>
				{#if $errors.name}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.name[0]}</p>
				{/if}
			</div>

			<div>
				<label for="email" class="mb-1.5 block text-sm font-medium text-slate-700"
					>{t('profile.email')}</label
				>
				<input
					id="email"
					name="email"
					type="email"
					dir="ltr"
					bind:value={$editForm.email}
					aria-invalid={$errors.email ? 'true' : undefined}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				/>
				{#if $errors.email}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.email[0]}</p>
				{/if}
			</div>

			<div>
				<label for="role" class="mb-1.5 block text-sm font-medium text-slate-700"
					>{t('profile.role')}</label
				>
				<select
					id="role"
					name="role"
					bind:value={$editForm.role}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				>
					<option value="member">{t('enum.role.member')}</option>
					<option value="project_manager">{t('enum.role.project_manager')}</option>
					<option value="admin">{t('enum.role.admin')}</option>
				</select>
				{#if $errors.role}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.role[0]}</p>
				{/if}
				{#if isSelf}
					<p class="mt-1.5 text-xs text-slate-500">{t('admin.users.edit.cannotChangeOwnRole')}</p>
				{/if}
			</div>

			<div>
				<label for="timezone" class="mb-1.5 block text-sm font-medium text-slate-700">
					{t('profile.timezone')}
				</label>
				<select
					id="timezone"
					name="timezone"
					bind:value={$editForm.timezone}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				>
					{#each data.timezones as timezoneOption (timezoneOption)}
						<option value={timezoneOption}>{timezoneOption}</option>
					{/each}
				</select>
				{#if $errors.timezone}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.timezone[0]}</p>
				{/if}
			</div>

			{#if hasOwnedProjects}
				<p class="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 sm:col-span-2">
					{t('admin.users.edit.ownedProjectsWarning', {
						count: data.managedUser.ownedProjects
					})}
				</p>
			{/if}

			<div class="sm:col-span-2">
				<button
					type="submit"
					disabled={$submitting}
					class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{$submitting ? t('common.saving') : t('common.saveChanges')}
				</button>
			</div>
		</form>
	</section>

	<section class="rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
		<div class="flex items-start gap-3">
			<span class="rounded-lg bg-rose-50 p-2 text-rose-600">
				<ShieldAlert class="h-5 w-5" />
			</span>
			<div>
				<h3 class="font-semibold text-slate-900">{t('admin.users.edit.accountActions')}</h3>
				<p class="mt-1 text-sm text-slate-500">{t('admin.users.edit.accountActionsHelp')}</p>
			</div>
		</div>

		<div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="rounded-lg border border-slate-200 p-4">
				<div class="flex items-center gap-2">
					<KeyRound class="h-4 w-4 text-slate-400" />
					<h4 class="text-sm font-semibold text-slate-900">
						{t('admin.users.edit.resetPassword')}
					</h4>
				</div>
				<p class="mt-1 text-xs leading-5 text-slate-500">{t('admin.users.edit.resetHelp')}</p>
				{#if canReset}
					<form
						method="POST"
						action="?/resetPassword"
						class="mt-3"
						onsubmit={(event) => {
							if (!confirm(t('admin.users.edit.resetConfirm', { name: data.managedUser.name }))) {
								event.preventDefault();
							}
						}}
					>
						<button
							type="submit"
							class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
						>
							<KeyRound class="h-4 w-4" />
							{t('admin.users.edit.resetPassword')}
						</button>
					</form>
				{:else}
					<p class="mt-3 text-xs text-slate-500">
						{t('server.resetOwnPassword')}
					</p>
				{/if}
			</div>

			<div class="rounded-lg border border-slate-200 p-4">
				<div class="flex items-center gap-2">
					{#if data.managedUser.isActive}
						<UserX class="h-4 w-4 text-rose-500" />
						<h4 class="text-sm font-semibold text-slate-900">
							{t('admin.users.edit.deactivateHeading')}
						</h4>
					{:else}
						<UserCheck class="h-4 w-4 text-emerald-500" />
						<h4 class="text-sm font-semibold text-slate-900">
							{t('admin.users.edit.reactivateHeading')}
						</h4>
					{/if}
				</div>

				{#if data.managedUser.isActive}
					<p class="mt-1 text-xs leading-5 text-slate-500">
						{t('admin.users.edit.deactivateHelp')}
					</p>
					{#if canDeactivate}
						<form
							method="POST"
							action="?/deactivate"
							class="mt-3"
							onsubmit={(event) => {
								if (
									!confirm(t('admin.users.edit.deactivateConfirm', { name: data.managedUser.name }))
								) {
									event.preventDefault();
								}
							}}
						>
							<button
								type="submit"
								class="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
							>
								<UserX class="h-4 w-4" />
								{t('admin.users.edit.deactivate')}
							</button>
						</form>
					{:else if isSelf}
						<p class="mt-3 text-xs text-slate-500">{t('errors.cannotDeactivateSelf')}</p>
					{:else if isOnlyActiveAdmin}
						<p class="mt-3 text-xs text-rose-600">{t('errors.lastAdminDeactivate')}</p>
					{:else if hasOwnedProjects}
						<p class="mt-3 text-xs text-rose-600">{t('errors.transferOwnership')}</p>
					{/if}
				{:else}
					<p class="mt-1 text-xs leading-5 text-slate-500">
						{t('admin.users.edit.reactivateHelp')}
					</p>
					<form method="POST" action="?/reactivate" class="mt-3">
						<button
							type="submit"
							class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
						>
							<UserCheck class="h-4 w-4" />
							{t('admin.users.edit.activate')}
						</button>
					</form>
				{/if}
			</div>
		</div>
	</section>
</div>
