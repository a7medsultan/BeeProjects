<script lang="ts">
	import { LogIn, ShieldCheck } from '@lucide/svelte';
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
</script>

<svelte:head>
	<title>{t('auth.pageTitle')}</title>
</svelte:head>

<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
	<div class="flex items-start gap-3">
		<span class="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
			<ShieldCheck class="h-5 w-5" />
		</span>
		<div>
			<h1 class="text-xl font-semibold tracking-tight text-slate-900">{t('auth.title')}</h1>
			<p class="mt-1 text-sm text-slate-500">{t('auth.subtitle')}</p>
		</div>
	</div>

	{#if data.loggedOut}
		<p class="mt-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
			{t('auth.loggedOut')}
		</p>
	{/if}

	{#if $message}
		<p
			class={[
				'mt-5 rounded-lg px-3 py-2 text-sm',
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

	<form method="POST" action="?/login" use:enhance class="mt-6 space-y-4">
		<input type="hidden" name="redirectTo" bind:value={$form.redirectTo} />

		<div>
			<label for="email" class="mb-1.5 block text-sm font-medium text-slate-700">
				{t('auth.email')}
			</label>
			<input
				id="email"
				name="email"
				type="email"
				dir="ltr"
				autocomplete="username"
				placeholder={t('auth.emailPlaceholder')}
				bind:value={$form.email}
				aria-invalid={$errors.email ? 'true' : undefined}
				aria-describedby={$errors.email ? 'email-error' : undefined}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			/>
			{#if $errors.email}
				<p id="email-error" class="mt-1.5 text-sm text-rose-600">{$errors.email[0]}</p>
			{/if}
		</div>

		<div>
			<label for="password" class="mb-1.5 block text-sm font-medium text-slate-700">
				{t('auth.password')}
			</label>
			<input
				id="password"
				name="_password"
				type="password"
				dir="ltr"
				autocomplete="current-password"
				placeholder={t('auth.passwordPlaceholder')}
				bind:value={$form._password}
				aria-invalid={$errors._password ? 'true' : undefined}
				aria-describedby={$errors._password ? 'password-error' : undefined}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			/>
			{#if $errors._password}
				<p id="password-error" class="mt-1.5 text-sm text-rose-600">{$errors._password[0]}</p>
			{/if}
		</div>

		<button
			type="submit"
			disabled={$submitting}
			class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
		>
			<LogIn class="h-4 w-4 rtl:-scale-x-100" />
			{$submitting ? t('common.loading') : t('auth.submit')}
		</button>
	</form>

	<p class="mt-4 text-xs leading-5 text-slate-500">
		{t('auth.forgotPassword')}
	</p>
</div>
