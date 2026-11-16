<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft, Check, Copy, KeyRound, ShieldAlert, UserCheck, UserX } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { ROLE_LABELS } from '#lib/constants.ts';
	import { formatDateTime } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

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
	<title>{data.managedUser.name} · Admin · BeeProjects</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6">
	<a
		href={resolve('/(app)/admin/users')}
		class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
	>
		<ArrowLeft class="h-4 w-4" />
		Back to users
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
							{ROLE_LABELS[data.managedUser.role]}
						</span>
						<span
							class={[
								'rounded-full px-2 py-0.5 font-medium',
								data.managedUser.isActive
									? 'bg-emerald-50 text-emerald-700'
									: 'bg-slate-100 text-slate-600'
							]}
						>
							{data.managedUser.isActive ? 'Active' : 'Inactive'}
						</span>
						{#if data.managedUser.mustChangePassword}
							<span class="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
								Temp password
							</span>
						{/if}
						{#if isSelf}
							<span class="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
								Your account
							</span>
						{/if}
					</div>
				</div>
			</div>

			<dl class="grid grid-cols-2 gap-3 text-sm">
				<div>
					<dt class="text-xs tracking-wide text-slate-400 uppercase">Projects</dt>
					<dd class="mt-0.5 font-medium text-slate-800">{data.managedUser.ownedProjects}</dd>
				</div>
				<div>
					<dt class="text-xs tracking-wide text-slate-400 uppercase">Last login</dt>
					<dd class="mt-0.5 font-medium text-slate-800">
						{formatDateTime(data.managedUser.lastLoginAt, timezone)}
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
				Temporary password for {resetEmail}
			</p>
			<div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
				<code class="flex-1 rounded-lg bg-white/80 px-3 py-2 font-mono text-sm text-slate-900">
					{resetPassword}
				</code>
				<button
					type="button"
					onclick={copyTempPassword}
					class="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
				>
					{#if copied}
						<Check class="h-4 w-4" />
						Copied
					{:else}
						<Copy class="h-4 w-4" />
						Copy
					{/if}
				</button>
			</div>
			<p class="mt-2 text-xs text-amber-800">
				Shown once. The user has been signed out everywhere and must change it at next sign-in.
			</p>
		</div>
	{/if}

	<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<h3 class="font-semibold text-slate-900">Account details</h3>
		<p class="mt-1 text-sm text-slate-500">
			Email changes take effect immediately. Role changes are subject to ownership and last-admin
			guards.
		</p>

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
				<label for="name" class="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
				<input
					id="name"
					name="name"
					type="text"
					bind:value={$editForm.name}
					aria-invalid={$errors.name ? 'true' : undefined}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				/>
				{#if $errors.name}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.name[0]}</p>
				{/if}
			</div>

			<div>
				<label for="email" class="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					bind:value={$editForm.email}
					aria-invalid={$errors.email ? 'true' : undefined}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				/>
				{#if $errors.email}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.email[0]}</p>
				{/if}
			</div>

			<div>
				<label for="role" class="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
				<select
					id="role"
					name="role"
					bind:value={$editForm.role}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				>
					<option value="member">Member</option>
					<option value="project_manager">Project Manager</option>
					<option value="admin">Admin</option>
				</select>
				{#if $errors.role}
					<p class="mt-1.5 text-sm text-rose-600">{$errors.role[0]}</p>
				{/if}
				{#if isSelf}
					<p class="mt-1.5 text-xs text-slate-500">You cannot change your own role.</p>
				{/if}
			</div>

			<div>
				<label for="timezone" class="mb-1.5 block text-sm font-medium text-slate-700">
					Timezone
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
					This user owns {data.managedUser.ownedProjects} non-archived project{data.managedUser
						.ownedProjects === 1
						? ''
						: 's'}. Ownership must be transferred before demoting to Member or deactivating.
				</p>
			{/if}

			<div class="sm:col-span-2">
				<button
					type="submit"
					disabled={$submitting}
					class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{$submitting ? 'Saving…' : 'Save changes'}
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
				<h3 class="font-semibold text-slate-900">Account actions</h3>
				<p class="mt-1 text-sm text-slate-500">
					Password resets and deactivations sign the user out of all sessions.
				</p>
			</div>
		</div>

		<div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="rounded-lg border border-slate-200 p-4">
				<div class="flex items-center gap-2">
					<KeyRound class="h-4 w-4 text-slate-400" />
					<h4 class="text-sm font-semibold text-slate-900">Reset password</h4>
				</div>
				<p class="mt-1 text-xs leading-5 text-slate-500">
					Generates a temporary password and forces a change at next sign-in.
				</p>
				{#if canReset}
					<form
						method="POST"
						action="?/resetPassword"
						class="mt-3"
						onsubmit={(event) => {
							if (
								!confirm(
									`Reset the password for ${data.managedUser.name}? They will be signed out.`
								)
							) {
								event.preventDefault();
							}
						}}
					>
						<button
							type="submit"
							class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
						>
							<KeyRound class="h-4 w-4" />
							Reset password
						</button>
					</form>
				{:else}
					<p class="mt-3 text-xs text-slate-500">
						Use the profile page to change your own password.
					</p>
				{/if}
			</div>

			<div class="rounded-lg border border-slate-200 p-4">
				<div class="flex items-center gap-2">
					{#if data.managedUser.isActive}
						<UserX class="h-4 w-4 text-rose-500" />
						<h4 class="text-sm font-semibold text-slate-900">Deactivate account</h4>
					{:else}
						<UserCheck class="h-4 w-4 text-emerald-500" />
						<h4 class="text-sm font-semibold text-slate-900">Reactivate account</h4>
					{/if}
				</div>

				{#if data.managedUser.isActive}
					<p class="mt-1 text-xs leading-5 text-slate-500">
						The user cannot sign in and all sessions are revoked. Historical records remain.
					</p>
					{#if canDeactivate}
						<form
							method="POST"
							action="?/deactivate"
							class="mt-3"
							onsubmit={(event) => {
								if (!confirm(`Deactivate ${data.managedUser.name}?`)) {
									event.preventDefault();
								}
							}}
						>
							<button
								type="submit"
								class="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
							>
								<UserX class="h-4 w-4" />
								Deactivate
							</button>
						</form>
					{:else if isSelf}
						<p class="mt-3 text-xs text-slate-500">You cannot deactivate your own account.</p>
					{:else if isOnlyActiveAdmin}
						<p class="mt-3 text-xs text-rose-600">The last active admin cannot be deactivated.</p>
					{:else if hasOwnedProjects}
						<p class="mt-3 text-xs text-rose-600">
							Transfer ownership of this user’s projects first.
						</p>
					{/if}
				{:else}
					<p class="mt-1 text-xs leading-5 text-slate-500">
						Reactivating restores sign-in access. The user keeps their current role and timezone.
					</p>
					<form method="POST" action="?/reactivate" class="mt-3">
						<button
							type="submit"
							class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
						>
							<UserCheck class="h-4 w-4" />
							Reactivate
						</button>
					</form>
				{/if}
			</div>
		</div>
	</section>
</div>
