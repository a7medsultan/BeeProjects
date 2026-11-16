<script lang="ts">
	import { resolve } from '$app/paths';
	import { Search, ShieldCheck, UserPlus } from '@lucide/svelte';
	import { ROLE_LABELS } from '#lib/constants.ts';
	import { formatDateTime } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function pageQuery(page: number): string {
		const params: string[] = [];
		if (data.filters.q) params.push(`q=${encodeURIComponent(data.filters.q)}`);
		if (data.filters.role !== 'all') params.push(`role=${encodeURIComponent(data.filters.role)}`);
		if (data.filters.status !== 'all') {
			params.push(`status=${encodeURIComponent(data.filters.status)}`);
		}
		params.push(`page=${page}`);
		return params.join('&');
	}

	const showingFrom = $derived(data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1);
	const showingTo = $derived(Math.min(data.page * data.pageSize, data.total));
	const timezone = $derived(data.user?.timezone ?? 'UTC');
</script>

<svelte:head>
	<title>Users · Admin · BeeProjects</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2 text-sm font-medium text-indigo-600">
				<ShieldCheck class="h-4 w-4" />
				Admin
			</div>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900">User management</h2>
			<p class="mt-1 text-sm text-slate-500">
				Create accounts, change roles, reset passwords, and deactivate users.
			</p>
		</div>
		<a
			href={resolve('/(app)/admin/users/new')}
			class="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:self-auto"
		>
			<UserPlus class="h-4 w-4" />
			New user
		</a>
	</div>

	<form
		method="GET"
		action={resolve('/(app)/admin/users')}
		class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto_auto_auto]"
	>
		<div class="relative">
			<label for="q" class="sr-only">Search users</label>
			<Search
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
			/>
			<input
				id="q"
				name="q"
				type="search"
				value={data.filters.q}
				placeholder="Search name or email"
				class="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			/>
		</div>

		<div>
			<label for="role" class="sr-only">Role</label>
			<select
				id="role"
				name="role"
				value={data.filters.role}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			>
				<option value="all">All roles</option>
				<option value="admin">Admin</option>
				<option value="project_manager">Project Manager</option>
				<option value="member">Member</option>
			</select>
		</div>

		<div>
			<label for="status" class="sr-only">Status</label>
			<select
				id="status"
				name="status"
				value={data.filters.status}
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
			>
				<option value="all">All statuses</option>
				<option value="active">Active</option>
				<option value="inactive">Inactive</option>
			</select>
		</div>

		<button
			type="submit"
			class="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
		>
			Filter
		</button>
	</form>

	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm">
				<thead
					class="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase"
				>
					<tr>
						<th scope="col" class="px-4 py-3">User</th>
						<th scope="col" class="px-4 py-3">Role</th>
						<th scope="col" class="px-4 py-3">Status</th>
						<th scope="col" class="px-4 py-3">Projects</th>
						<th scope="col" class="px-4 py-3">Last login</th>
						<th scope="col" class="px-4 py-3 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each data.users as user (user.id)}
						<tr class="transition hover:bg-slate-50/70">
							<td class="px-4 py-3">
								<div class="font-medium text-slate-900">{user.name}</div>
								<div class="text-xs text-slate-500">{user.email}</div>
							</td>
							<td class="px-4 py-3 text-slate-700">{ROLE_LABELS[user.role]}</td>
							<td class="px-4 py-3">
								<span
									class={[
										'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
										user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
									]}
								>
									{user.isActive ? 'Active' : 'Inactive'}
								</span>
								{#if user.mustChangePassword}
									<span
										class="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
									>
										Temp password
									</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-slate-600">{user.ownedProjects}</td>
							<td class="px-4 py-3 text-slate-600">{formatDateTime(user.lastLoginAt, timezone)}</td>
							<td class="px-4 py-3 text-right">
								<a
									href={resolve('/(app)/admin/users/[id]', { id: user.id })}
									class="inline-flex rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
								>
									Manage
								</a>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="px-4 py-12 text-center text-sm text-slate-500">
								No users match these filters.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div
			class="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
		>
			<p class="text-xs text-slate-500">
				Showing {showingFrom}–{showingTo} of {data.total} users
			</p>
			<div class="flex items-center gap-2">
				{#if data.page > 1}
					<a
						href={resolve(`/(app)/admin/users?${pageQuery(data.page - 1)}`)}
						class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
					>
						Previous
					</a>
				{/if}
				<span class="text-xs text-slate-500">Page {data.page} of {data.totalPages}</span>
				{#if data.page < data.totalPages}
					<a
						href={resolve(`/(app)/admin/users?${pageQuery(data.page + 1)}`)}
						class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
					>
						Next
					</a>
				{/if}
			</div>
		</div>
	</div>
</div>
