<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft, LogIn, ShieldCheck } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Sign in · BeeProjects</title>
</svelte:head>

<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
	<div class="flex items-start gap-3">
		<span class="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
			<ShieldCheck class="h-5 w-5" />
		</span>
		<div>
			<h1 class="text-xl font-semibold tracking-tight text-slate-900">Sign in</h1>
			<p class="mt-1 text-sm text-slate-500">
				Session-based authentication is wired up in milestone M1.
			</p>
		</div>
	</div>

	<form method="POST" action="?/login" class="mt-6 space-y-4" aria-describedby="login-note">
		<div>
			<label for="email" class="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="username"
				placeholder="you@example.com"
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			/>
		</div>

		<div>
			<label for="password" class="mb-1.5 block text-sm font-medium text-slate-700">
				Password
			</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				placeholder="••••••••••"
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			/>
		</div>

		<button
			type="submit"
			disabled
			class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white opacity-60"
		>
			<LogIn class="h-4 w-4" />
			Sign in
		</button>
	</form>

	<p id="login-note" class="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
		This is the M0 login shell. Accounts, sessions, and role guards are enabled in M1.
	</p>

	<a
		href={resolve('/(app)')}
		class="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
	>
		<ArrowLeft class="h-4 w-4" />
		Back to dashboard preview
	</a>
</div>
