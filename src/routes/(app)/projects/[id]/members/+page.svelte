<script lang="ts">
	import { UserPlus, Users } from '@lucide/svelte';
	import { formatDateTime } from '#lib/format.ts';
	import { useI18n } from '#lib/i18n/index.ts';
	import { ROLE_KEYS } from '#lib/i18n/labels.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const { t, locale } = useI18n();

	const notice = $derived(form && 'notice' in form ? form.notice : undefined);
	const actionError = $derived(form && 'error' in form ? form.error : undefined);
	const timezone = $derived(data.user?.timezone ?? 'UTC');
</script>

<svelte:head>
	<title>{t('projects.members.pageTitle', { project: data.project.name })}</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold tracking-tight text-slate-900">
			{t('projects.members.title')}
		</h2>
		<p class="mt-1 text-sm text-slate-500">{t('projects.members.subtitle')}</p>
	</div>

	{#if notice}
		<p
			class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
			role="status"
		>
			{notice}
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

	{#if data.permissions.canAddMembers}
		<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="flex items-center gap-2">
				<UserPlus class="h-4 w-4 text-slate-400" />
				<h3 class="font-semibold text-slate-900">{t('projects.members.addTitle')}</h3>
			</div>

			{#if data.candidates.length > 0}
				<form method="POST" action="?/add" class="mt-4 flex flex-col gap-3 sm:flex-row">
					<div class="flex-1">
						<label for="userId" class="sr-only">{t('projects.members.selectUser')}</label>
						<select
							id="userId"
							name="userId"
							class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
						>
							{#each data.candidates as candidate (candidate.id)}
								<option value={candidate.id}>{candidate.name} · {candidate.email}</option>
							{/each}
						</select>
					</div>
					<button
						type="submit"
						class="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
					>
						<UserPlus class="h-4 w-4" />
						{t('projects.members.addButton')}
					</button>
				</form>
			{:else}
				<p class="mt-3 text-sm text-slate-500">{t('projects.members.allActive')}</p>
			{/if}
		</section>
	{:else if data.permissions.isArchived}
		<p class="rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
			{t('projects.members.archivedNotice')}
		</p>
	{/if}

	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm">
				<thead
					class="bg-slate-50 text-start text-xs font-semibold tracking-wide text-slate-500 uppercase"
				>
					<tr>
						<th scope="col" class="px-4 py-3">{t('projects.members.member')}</th>
						<th scope="col" class="px-4 py-3">{t('projects.members.role')}</th>
						<th scope="col" class="px-4 py-3">{t('projects.members.openTasks')}</th>
						<th scope="col" class="px-4 py-3">{t('projects.members.joined')}</th>
						<th scope="col" class="px-4 py-3 text-end">{t('common.actions')}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each data.members as member (member.userId)}
						<tr class="transition hover:bg-slate-50/70">
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									<div
										class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600"
									>
										{member.name.slice(0, 1).toUpperCase()}
									</div>
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-2">
											<span dir="auto" class="user-text font-medium text-slate-900">
												{member.name}
											</span>
											{#if member.isOwner}
												<span
													class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
												>
													{t('projects.members.ownerBadge')}
												</span>
											{/if}
											{#if !member.isActive}
												<span
													class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
												>
													{t('common.inactive')}
												</span>
											{/if}
										</div>
										<p dir="ltr" class="ltr-text truncate text-xs text-slate-500">
											{member.email}
										</p>
									</div>
								</div>
							</td>
							<td class="px-4 py-3 text-slate-700">{t(ROLE_KEYS[member.role])}</td>
							<td class="px-4 py-3">
								{#if member.openTasks > 0}
									<span class="font-medium text-amber-700">
										{t('projects.members.openCount', { count: member.openTasks })}
									</span>
								{:else}
									<span class="text-slate-400">0</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-slate-600">
								{formatDateTime(member.addedAt, timezone, locale)}
							</td>
							<td class="px-4 py-3 text-end">
								{#if data.permissions.canRemoveMembers && !member.isOwner && member.openTasks === 0}
									<form
										method="POST"
										action="?/remove"
										class="inline"
										onsubmit={(event) => {
											if (!confirm(t('projects.members.removeConfirm', { name: member.name }))) {
												event.preventDefault();
											}
										}}
									>
										<input type="hidden" name="userId" value={member.userId} />
										<button
											type="submit"
											class="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
										>
											{t('projects.members.remove')}
										</button>
									</form>
								{:else if member.isOwner}
									<span class="text-xs text-slate-400">
										{t('projects.members.ownerCannotRemove')}
									</span>
								{:else if member.openTasks > 0}
									<span class="text-xs text-slate-400">
										{t('projects.members.reassignFirst')}
									</span>
								{/if}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="5" class="px-4 py-12 text-center text-sm text-slate-500">
								<Users class="mx-auto mb-2 h-8 w-8 text-slate-300" />
								{t('projects.members.noMembers')}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
