<script lang="ts">
	import { resolve } from '$app/paths';
	import { KeyRound, LogOut, Mail, Shield, UserRound } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { useI18n } from '#lib/i18n/index.ts';
	import { ROLE_KEYS } from '#lib/i18n/labels.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const { t, locale } = useI18n();

	const {
		form: profileForm,
		errors: profileErrors,
		message: profileMessage,
		enhance: enhanceProfile,
		submitting: profileSubmitting
	} = superForm(
		untrack(() => data.profileForm),
		{
			taintedMessage: false,
			onUpdated({ form }) {
				if (form.valid && form.data.locale !== locale) {
					location.reload();
				}
			}
		}
	);

	const {
		form: passwordForm,
		errors: passwordErrors,
		message: passwordMessage,
		enhance: enhancePassword,
		submitting: passwordSubmitting
	} = superForm(
		untrack(() => data.passwordForm),
		{
			taintedMessage: false
		}
	);
</script>

<svelte:head>
	<title>{t('profile.pageTitle')}</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-semibold tracking-tight text-slate-900">{t('profile.title')}</h2>
		<p class="mt-1 text-sm text-slate-500">{t('profile.subtitle')}</p>
	</div>

	{#if data.forcePasswordChange}
		<div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
			<p class="font-semibold text-amber-900">{t('profile.forceTitle')}</p>
			<p class="mt-1 text-sm text-amber-800">{t('profile.forceBody')}</p>
			<a
				href="#change-password"
				class="mt-2 inline-block text-sm font-semibold text-amber-900 underline"
			>
				{t('profile.forceLink')}
			</a>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
		<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
			<div class="flex items-center gap-4">
				<div
					class="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-semibold text-indigo-700"
				>
					{data.user?.name.slice(0, 1).toUpperCase() ?? '?'}
				</div>
				<div class="min-w-0">
					<p dir="auto" class="user-text truncate text-lg font-semibold text-slate-900">
						{data.user?.name ?? t('profile.unknownUser')}
					</p>
					<p dir="ltr" class="ltr-text truncate text-sm text-slate-500">{data.user?.email}</p>
				</div>
			</div>

			<dl class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="rounded-lg bg-slate-50 p-3">
					<dt
						class="flex items-center gap-2 text-xs font-medium tracking-wide text-slate-400 uppercase"
					>
						<Mail class="h-3.5 w-3.5" />
						{t('profile.email')}
					</dt>
					<dd dir="ltr" class="ltr-text mt-1 text-sm text-slate-800">{data.user?.email}</dd>
				</div>
				<div class="rounded-lg bg-slate-50 p-3">
					<dt
						class="flex items-center gap-2 text-xs font-medium tracking-wide text-slate-400 uppercase"
					>
						<Shield class="h-3.5 w-3.5" />
						{t('profile.role')}
					</dt>
					<dd class="mt-1 text-sm text-slate-800">
						{data.user ? t(ROLE_KEYS[data.user.role]) : '—'}
					</dd>
				</div>
			</dl>

			{#if $profileMessage}
				<p
					class={[
						'mt-5 rounded-lg px-3 py-2 text-sm',
						$profileMessage.type === 'error'
							? 'bg-rose-50 text-rose-800'
							: $profileMessage.type === 'warning'
								? 'bg-amber-50 text-amber-800'
								: 'bg-emerald-50 text-emerald-800'
					]}
					role="status"
				>
					{$profileMessage.text}
				</p>
			{/if}

			<form method="POST" action="?/updateProfile" use:enhanceProfile class="mt-6 space-y-4">
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
						bind:value={$profileForm.name}
						aria-invalid={$profileErrors.name ? 'true' : undefined}
						class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
					/>
					{#if $profileErrors.name}
						<p class="mt-1.5 text-sm text-rose-600">{$profileErrors.name[0]}</p>
					{/if}
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<label for="locale" class="mb-1.5 block text-sm font-medium text-slate-700">
							{t('profile.language')}
						</label>
						<select
							id="locale"
							name="locale"
							bind:value={$profileForm.locale}
							class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
						>
							<option value="en" lang="en" dir="ltr">{t('common.english')}</option>
							<option value="ar" lang="ar" dir="rtl">{t('common.arabic')}</option>
						</select>
						{#if $profileErrors.locale}
							<p class="mt-1.5 text-sm text-rose-600">{$profileErrors.locale[0]}</p>
						{/if}
					</div>

					<div>
						<label for="timezone" class="mb-1.5 block text-sm font-medium text-slate-700">
							{t('profile.timezone')}
						</label>
						<select
							id="timezone"
							name="timezone"
							bind:value={$profileForm.timezone}
							class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
						>
							{#each data.timezones as timezone (timezone)}
								<option value={timezone}>{timezone}</option>
							{/each}
						</select>
						{#if $profileErrors.timezone}
							<p class="mt-1.5 text-sm text-rose-600">{$profileErrors.timezone[0]}</p>
						{/if}
						<p class="mt-1.5 text-xs text-slate-500">{t('profile.timezoneHelp')}</p>
					</div>
				</div>

				<button
					type="submit"
					disabled={$profileSubmitting}
					class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{$profileSubmitting ? t('common.saving') : t('profile.save')}
				</button>
			</form>
		</section>

		<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex items-center gap-2">
				<UserRound class="h-4 w-4 text-slate-400" />
				<h3 class="font-semibold text-slate-900">{t('profile.session')}</h3>
			</div>
			<p class="mt-2 text-sm text-slate-500">
				{t('profile.signedInAsBefore')}
				<bdi dir="ltr" class="ltr-text">{data.user?.email ?? ''}</bdi>{t('profile.signedInAsAfter')}
			</p>

			<form method="POST" action="?/logout" class="mt-4">
				<button
					type="submit"
					class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
				>
					<LogOut class="h-4 w-4 rtl:-scale-x-100" />
					{t('common.signOut')}
				</button>
			</form>
		</section>
	</div>

	<section id="change-password" class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex items-center gap-2">
			<KeyRound class="h-4 w-4 text-slate-400" />
			<h3 class="font-semibold text-slate-900">{t('profile.changePassword')}</h3>
		</div>
		<p class="mt-1 text-sm text-slate-500">{t('profile.passwordHelp')}</p>

		{#if $passwordMessage}
			<p
				class={[
					'mt-4 rounded-lg px-3 py-2 text-sm',
					$passwordMessage.type === 'error'
						? 'bg-rose-50 text-rose-800'
						: $passwordMessage.type === 'warning'
							? 'bg-amber-50 text-amber-800'
							: 'bg-emerald-50 text-emerald-800'
				]}
				role="status"
			>
				{$passwordMessage.text}
			</p>
		{/if}

		<form
			method="POST"
			action="?/changePassword"
			use:enhancePassword
			class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3"
		>
			<div>
				<label for="currentPassword" class="mb-1.5 block text-sm font-medium text-slate-700">
					{t('profile.currentPassword')}
				</label>
				<input
					id="currentPassword"
					name="_currentPassword"
					type="password"
					dir="ltr"
					autocomplete="current-password"
					bind:value={$passwordForm._currentPassword}
					aria-invalid={$passwordErrors._currentPassword ? 'true' : undefined}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				/>
				{#if $passwordErrors._currentPassword}
					<p class="mt-1.5 text-sm text-rose-600">{$passwordErrors._currentPassword[0]}</p>
				{/if}
			</div>

			<div>
				<label for="newPassword" class="mb-1.5 block text-sm font-medium text-slate-700">
					{t('profile.newPassword')}
				</label>
				<input
					id="newPassword"
					name="_newPassword"
					type="password"
					dir="ltr"
					autocomplete="new-password"
					bind:value={$passwordForm._newPassword}
					aria-invalid={$passwordErrors._newPassword ? 'true' : undefined}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				/>
				{#if $passwordErrors._newPassword}
					<p class="mt-1.5 text-sm text-rose-600">{$passwordErrors._newPassword[0]}</p>
				{/if}
			</div>

			<div>
				<label for="confirmPassword" class="mb-1.5 block text-sm font-medium text-slate-700">
					{t('profile.confirmPassword')}
				</label>
				<input
					id="confirmPassword"
					name="_confirmPassword"
					type="password"
					dir="ltr"
					autocomplete="new-password"
					bind:value={$passwordForm._confirmPassword}
					aria-invalid={$passwordErrors._confirmPassword ? 'true' : undefined}
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
				/>
				{#if $passwordErrors._confirmPassword}
					<p class="mt-1.5 text-sm text-rose-600">{$passwordErrors._confirmPassword[0]}</p>
				{/if}
			</div>

			<div class="md:col-span-3">
				<button
					type="submit"
					disabled={$passwordSubmitting}
					class="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{$passwordSubmitting ? t('common.saving') : t('profile.updatePassword')}
				</button>
			</div>
		</form>
	</section>

	<a
		href={resolve('/(app)')}
		class="inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-700"
	>
		{t('profile.backToDashboard')}
	</a>
</div>
