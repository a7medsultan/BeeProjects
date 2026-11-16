<script lang="ts">
	import { resolve } from '$app/paths';
	import { Mail, Shield, UserRound } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Profile · BeeProjects</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-semibold tracking-tight text-slate-900">Profile</h2>
		<p class="mt-1 text-sm text-slate-500">Your account, timezone, and password.</p>
	</div>

	<div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		{#if data.user}
			<div class="flex items-center gap-4">
				<div
					class="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-semibold text-indigo-700"
				>
					{data.user.name.slice(0, 1).toUpperCase()}
				</div>
				<div>
					<p class="text-lg font-semibold text-slate-900">{data.user.name}</p>
					<p class="text-sm text-slate-500 capitalize">{data.user.role.replace('_', ' ')}</p>
				</div>
			</div>

			<dl class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="rounded-lg bg-slate-50 p-3">
					<dt
						class="flex items-center gap-2 text-xs font-medium tracking-wide text-slate-400 uppercase"
					>
						<Mail class="h-3.5 w-3.5" /> Email
					</dt>
					<dd class="mt-1 text-sm text-slate-800">{data.user.email}</dd>
				</div>
				<div class="rounded-lg bg-slate-50 p-3">
					<dt
						class="flex items-center gap-2 text-xs font-medium tracking-wide text-slate-400 uppercase"
					>
						<Shield class="h-3.5 w-3.5" /> Role
					</dt>
					<dd class="mt-1 text-sm text-slate-800 capitalize">
						{data.user.role.replace('_', ' ')}
					</dd>
				</div>
			</dl>
		{:else}
			<div class="flex items-center gap-4">
				<div
					class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"
				>
					<UserRound class="h-7 w-7" />
				</div>
				<div>
					<p class="font-semibold text-slate-900">Not signed in</p>
					<p class="text-sm text-slate-500">
						Profile editing, timezone, and password management are enabled in M1.
					</p>
				</div>
			</div>
			<a
				href={resolve('/(auth)/login')}
				class="mt-6 inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
			>
				Go to sign in
			</a>
		{/if}
	</div>
</div>
