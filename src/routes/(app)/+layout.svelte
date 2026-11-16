<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import logo from '#lib/assets/favicon.svg';
	import {
		Bell,
		FolderKanban,
		LayoutDashboard,
		ListChecks,
		LogOut,
		Menu,
		Shield,
		UserRound,
		X
	} from '@lucide/svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	let sidebarOpen = $state(false);

	const baseNavigation = [
		{ path: '/', href: resolve('/(app)'), label: 'Dashboard', icon: LayoutDashboard },
		{
			path: '/projects',
			href: resolve('/(app)/projects'),
			label: 'Projects',
			icon: FolderKanban
		},
		{
			path: '/my-tasks',
			href: resolve('/(app)/my-tasks'),
			label: 'My Tasks',
			icon: ListChecks
		},
		{
			path: '/notifications',
			href: resolve('/(app)/notifications'),
			label: 'Notifications',
			icon: Bell
		},
		{ path: '/profile', href: resolve('/(app)/profile'), label: 'Profile', icon: UserRound }
	];

	const navigation = $derived([
		...baseNavigation,
		...(data.user?.role === 'admin'
			? [
					{
						path: '/admin',
						href: resolve('/(app)/admin/users'),
						label: 'Admin',
						icon: Shield
					}
				]
			: [])
	]);

	const pathname = $derived(page.url.pathname);

	function isActive(path: string): boolean {
		return path === '/' ? pathname === '/' : pathname.startsWith(path);
	}

	function closeSidebar(): void {
		sidebarOpen = false;
	}
</script>

<svelte:head>
	<title>BeeProjects</title>
</svelte:head>

<div class="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
	<!-- Mobile top bar -->
	<header
		class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden"
	>
		<a
			href={resolve('/(app)')}
			class="flex items-center gap-2 font-semibold text-slate-900"
			onclick={closeSidebar}
		>
			<img src={logo} alt="" class="h-8 w-8" />
			<span>BeeProjects</span>
		</a>
		<button
			type="button"
			class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50"
			aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
			aria-expanded={sidebarOpen}
			onclick={() => (sidebarOpen = !sidebarOpen)}
		>
			{#if sidebarOpen}
				<X class="h-5 w-5" />
			{:else}
				<Menu class="h-5 w-5" />
			{/if}
		</button>
	</header>

	<!-- Sidebar -->
	<aside
		class={[
			'fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0',
			sidebarOpen ? 'translate-x-0' : '-translate-x-full'
		]}
		aria-label="Main navigation"
	>
		<div class="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
			<img src={logo} alt="" class="h-8 w-8" />
			<span class="text-lg font-semibold tracking-tight text-slate-900">BeeProjects</span>
			<span
				class="ml-auto rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700"
			>
				M2
			</span>
		</div>

		<nav class="space-y-1 p-3">
			{#each navigation as item (item.path)}
				<a
					href={item.href}
					class={[
						'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
						isActive(item.path)
							? 'bg-indigo-50 text-indigo-700'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
					]}
					aria-current={isActive(item.path) ? 'page' : undefined}
					onclick={closeSidebar}
				>
					<item.icon class="h-[18px] w-[18px] shrink-0" />
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="absolute inset-x-0 bottom-0 border-t border-slate-200 p-4">
			{#if data.user}
				<div class="flex items-center gap-3">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700"
					>
						{data.user.name.slice(0, 1).toUpperCase()}
					</div>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium text-slate-900">{data.user.name}</p>
						<p class="truncate text-xs text-slate-500 capitalize">
							{data.user.role.replace('_', ' ')}
						</p>
					</div>
				</div>
				<form method="POST" action={resolve('/(app)/profile') + '?/logout'} class="mt-3">
					<button
						type="submit"
						class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
					>
						<LogOut class="h-4 w-4" />
						Sign out
					</button>
				</form>
			{:else}
				<a
					href={resolve('/(auth)/login')}
					class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
				>
					<UserRound class="h-4 w-4" />
					Sign in
				</a>
				<p class="mt-2 text-[11px] leading-4 text-slate-400">
					Server-side sessions and role guards are active.
				</p>
			{/if}
		</div>
	</aside>

	{#if sidebarOpen}
		<button
			type="button"
			class="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
			aria-label="Close navigation"
			onclick={closeSidebar}
		></button>
	{/if}

	<!-- Main -->
	<main class="min-w-0">
		<div class="border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="text-xs font-medium tracking-wider text-slate-400 uppercase">
						Phase 0 · MVP foundation
					</p>
					<h1 class="text-lg font-semibold text-slate-900">Project workspace</h1>
				</div>
				<div class="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
					<span class="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
					Local development
				</div>
			</div>
		</div>

		<div class="mx-auto w-full max-w-7xl p-4 lg:p-8">
			{@render children()}
		</div>
	</main>
</div>
