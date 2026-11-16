<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft, CalendarDays, MessageSquare, Paperclip, Plus, Trash2 } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import ActivityTimeline from '#lib/components/activity/ActivityTimeline.svelte';
	import {
		TASK_PRIORITIES,
		TASK_PRIORITY_CLASSES,
		TASK_PRIORITY_LABELS,
		TASK_STATUSES,
		TASK_STATUS_CLASSES,
		TASK_STATUS_LABELS
	} from '#lib/constants.ts';
	import { formatDate, formatDateTime } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const { form, errors, message, enhance, submitting } = superForm(
		untrack(() => data.form),
		{ taintedMessage: false }
	);

	const backHref = $derived(
		data.task.parentTaskId
			? resolve('/(app)/tasks/[id]', { id: data.task.parentTaskId })
			: resolve('/(app)/projects/[id]/list', { id: data.project.id })
	);

	const addSubtaskHref = $derived(
		resolve(`/(app)/projects/[id]/tasks/new?parent=${data.task.id}`, {
			id: data.project.id
		})
	);
</script>

<svelte:head>
	<title>{data.task.title} · BeeProjects</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6">
	<a
		href={backHref}
		class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
	>
		<ArrowLeft class="h-4 w-4" />
		{data.task.parentTaskId ? 'Back to parent task' : 'Back to task list'}
	</a>

	<div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
			<div class="min-w-0">
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="text-2xl font-semibold tracking-tight text-slate-900">{data.task.title}</h1>
					<span
						class={[
							'rounded-full px-2.5 py-0.5 text-xs font-medium',
							TASK_STATUS_CLASSES[data.task.status]
						]}
					>
						{TASK_STATUS_LABELS[data.task.status]}
					</span>
					<span
						class={[
							'rounded-full px-2.5 py-0.5 text-xs font-medium',
							TASK_PRIORITY_CLASSES[data.task.priority]
						]}
					>
						{TASK_PRIORITY_LABELS[data.task.priority]}
					</span>
					{#if data.task.isOverdue}
						<span class="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
							Overdue
						</span>
					{/if}
					{#if data.task.parentTaskId}
						<span
							class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
						>
							Subtask
						</span>
					{/if}
				</div>

				<p class="mt-2 text-sm text-slate-500">
					Project:
					<a
						href={resolve('/(app)/projects/[id]', { id: data.project.id })}
						class="font-medium text-indigo-600 hover:text-indigo-700"
					>
						{data.project.name}
					</a>
					{#if data.task.parentTaskId}
						· Parent:
						<a
							href={resolve('/(app)/tasks/[id]', { id: data.task.parentTaskId })}
							class="font-medium text-indigo-600 hover:text-indigo-700"
						>
							{data.task.parentTitle}
						</a>
					{/if}
				</p>

				<div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
					<span>Created by {data.task.createdByName}</span>
					<span class="flex items-center gap-1.5">
						<CalendarDays class="h-3.5 w-3.5 text-slate-400" />
						{data.task.dueDate ? `Due ${formatDate(data.task.dueDate)}` : 'No due date'}
					</span>
					<span>Updated {formatDateTime(data.task.updatedAt, data.user?.timezone ?? 'UTC')}</span>
				</div>
			</div>

			{#if data.permissions.canCreateSubtask}
				<a
					href={addSubtaskHref}
					class="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
				>
					<Plus class="h-4 w-4" />
					Add subtask
				</a>
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
		<div class="space-y-6 xl:col-span-2">
			{#if data.permissions.canEdit}
				<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
					<h2 class="font-semibold text-slate-900">Edit task</h2>
					<p class="mt-1 text-sm text-slate-500">
						{#if data.permissions.canManageAssignees}
							Update fields, status, dates, and assignees.
						{:else}
							You can update this task because it is assigned to you. Assignees are managed by the
							project manager.
						{/if}
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

					<form method="POST" action="?/update" use:enhance class="mt-5 space-y-5">
						<div>
							<label for="title" class="mb-1.5 block text-sm font-medium text-slate-700">
								Title
							</label>
							<input
								id="title"
								name="title"
								type="text"
								bind:value={$form.title}
								aria-invalid={$errors.title ? 'true' : undefined}
								class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
							/>
							{#if $errors.title}
								<p class="mt-1.5 text-sm text-rose-600">{$errors.title[0]}</p>
							{/if}
						</div>

						<div>
							<label for="description" class="mb-1.5 block text-sm font-medium text-slate-700">
								Description
							</label>
							<textarea
								id="description"
								name="description"
								rows="5"
								bind:value={$form.description}
								class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
							></textarea>
							{#if $errors.description}
								<p class="mt-1.5 text-sm text-rose-600">{$errors.description[0]}</p>
							{/if}
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<label for="status" class="mb-1.5 block text-sm font-medium text-slate-700">
									Status
								</label>
								<select
									id="status"
									name="status"
									bind:value={$form.status}
									class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
								>
									{#each TASK_STATUSES as status (status)}
										<option value={status}>{TASK_STATUS_LABELS[status]}</option>
									{/each}
								</select>
								{#if $errors.status}
									<p class="mt-1.5 text-sm text-rose-600">{$errors.status[0]}</p>
								{/if}
							</div>

							<div>
								<label for="priority" class="mb-1.5 block text-sm font-medium text-slate-700">
									Priority
								</label>
								<select
									id="priority"
									name="priority"
									bind:value={$form.priority}
									class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
								>
									{#each TASK_PRIORITIES as priority (priority)}
										<option value={priority}>{TASK_PRIORITY_LABELS[priority]}</option>
									{/each}
								</select>
								{#if $errors.priority}
									<p class="mt-1.5 text-sm text-rose-600">{$errors.priority[0]}</p>
								{/if}
							</div>

							<div>
								<label for="startDate" class="mb-1.5 block text-sm font-medium text-slate-700">
									Start date
								</label>
								<input
									id="startDate"
									name="startDate"
									type="date"
									bind:value={$form.startDate}
									class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
								/>
								{#if $errors.startDate}
									<p class="mt-1.5 text-sm text-rose-600">{$errors.startDate[0]}</p>
								{/if}
							</div>

							<div>
								<label for="dueDate" class="mb-1.5 block text-sm font-medium text-slate-700">
									Due date
								</label>
								<input
									id="dueDate"
									name="dueDate"
									type="date"
									bind:value={$form.dueDate}
									aria-invalid={$errors.dueDate ? 'true' : undefined}
									class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
								/>
								{#if $errors.dueDate}
									<p class="mt-1.5 text-sm text-rose-600">{$errors.dueDate[0]}</p>
								{/if}
							</div>
						</div>

						{#if data.permissions.canManageAssignees}
							<div>
								<p class="mb-2 block text-sm font-medium text-slate-700">Assignees</p>
								{#if data.members.length > 0}
									<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
										{#each data.members as member (member.userId)}
											<label
												class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
											>
												<input
													type="checkbox"
													name="assigneeIds"
													value={member.userId}
													bind:group={$form.assigneeIds}
													class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
												/>
												<span class="min-w-0 truncate">{member.name}</span>
												{#if !member.isActive}
													<span
														class="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
													>
														Inactive
													</span>
												{/if}
											</label>
										{/each}
									</div>
								{:else}
									<p class="text-sm text-slate-500">No active project members to assign.</p>
								{/if}
								{#if $errors.assigneeIds}
									<p class="mt-1.5 text-sm text-rose-600">{$errors.assigneeIds[0]}</p>
								{/if}
							</div>
						{/if}

						<button
							type="submit"
							disabled={$submitting}
							class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{$submitting ? 'Saving…' : 'Save task'}
						</button>
					</form>
				</section>
			{:else}
				<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
					<h2 class="font-semibold text-slate-900">Details</h2>
					<p class="mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-600">
						{data.task.description || 'No description has been added.'}
					</p>
					<dl class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div class="rounded-lg bg-slate-50 p-3">
							<dt class="text-xs tracking-wide text-slate-400 uppercase">Status</dt>
							<dd class="mt-1 text-sm text-slate-800">{TASK_STATUS_LABELS[data.task.status]}</dd>
						</div>
						<div class="rounded-lg bg-slate-50 p-3">
							<dt class="text-xs tracking-wide text-slate-400 uppercase">Priority</dt>
							<dd class="mt-1 text-sm text-slate-800">
								{TASK_PRIORITY_LABELS[data.task.priority]}
							</dd>
						</div>
						<div class="rounded-lg bg-slate-50 p-3">
							<dt class="text-xs tracking-wide text-slate-400 uppercase">Start date</dt>
							<dd class="mt-1 text-sm text-slate-800">
								{data.task.startDate ? formatDate(data.task.startDate) : 'Not set'}
							</dd>
						</div>
						<div class="rounded-lg bg-slate-50 p-3">
							<dt class="text-xs tracking-wide text-slate-400 uppercase">Due date</dt>
							<dd class="mt-1 text-sm text-slate-800">
								{data.task.dueDate ? formatDate(data.task.dueDate) : 'Not set'}
							</dd>
						</div>
					</dl>
					<div class="mt-4">
						<p class="text-xs tracking-wide text-slate-400 uppercase">Assignees</p>
						<div class="mt-1.5 flex flex-wrap gap-1.5">
							{#each data.task.assignees as assignee (assignee.userId)}
								<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
									{assignee.name}
								</span>
							{:else}
								<span class="text-sm text-slate-400">Unassigned</span>
							{/each}
						</div>
					</div>
				</section>
			{/if}

			<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex items-center justify-between gap-3">
					<div>
						<h2 class="font-semibold text-slate-900">Subtasks</h2>
						<p class="mt-1 text-sm text-slate-500">
							{data.task.completedSubtaskCount}/{data.task.subtaskCount} complete
						</p>
					</div>
					{#if data.permissions.canCreateSubtask}
						<a
							href={addSubtaskHref}
							class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
						>
							<Plus class="h-4 w-4" />
							Add subtask
						</a>
					{/if}
				</div>

				<ul class="mt-4 divide-y divide-slate-100">
					{#each data.subtasks as subtask (subtask.id)}
						<li class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
							<div class="min-w-0">
								<a
									href={resolve('/(app)/tasks/[id]', { id: subtask.id })}
									class="font-medium text-slate-800 hover:text-indigo-700"
								>
									{subtask.title}
								</a>
								<p class="mt-0.5 text-xs text-slate-500">
									{#if subtask.assignees.length > 0}
										{subtask.assignees.map((assignee) => assignee.name).join(', ')}
									{:else}
										Unassigned
									{/if}
									{#if subtask.dueDate}
										· Due {formatDate(subtask.dueDate)}
									{/if}
								</p>
							</div>
							<div class="flex shrink-0 items-center gap-2">
								<span
									class={[
										'rounded-full px-2 py-0.5 text-xs font-medium',
										TASK_PRIORITY_CLASSES[subtask.priority]
									]}
								>
									{TASK_PRIORITY_LABELS[subtask.priority]}
								</span>
								<span
									class={[
										'rounded-full px-2 py-0.5 text-xs font-medium',
										TASK_STATUS_CLASSES[subtask.status]
									]}
								>
									{TASK_STATUS_LABELS[subtask.status]}
								</span>
							</div>
						</li>
					{:else}
						<li class="py-6 text-center text-sm text-slate-500">No subtasks yet.</li>
					{/each}
				</ul>
			</section>

			<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 class="font-semibold text-slate-900">Activity</h2>
				<div class="mt-4">
					<ActivityTimeline
						items={data.activity.items}
						timezone={data.user?.timezone ?? 'UTC'}
						emptyMessage="Task activity will appear here."
					/>
				</div>
			</section>
		</div>

		<div class="space-y-6">
			<section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
				<h2 class="font-semibold text-slate-900">Collaboration</h2>
				<div class="mt-3 space-y-3">
					<div
						class="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"
					>
						<MessageSquare class="h-4 w-4 text-slate-400" />
						Comments arrive in M5
					</div>
					<div
						class="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"
					>
						<Paperclip class="h-4 w-4 text-slate-400" />
						Attachments arrive in M5
					</div>
				</div>
			</section>

			{#if data.permissions.canDelete}
				<section class="rounded-xl border border-rose-200 bg-white p-5 shadow-sm">
					<h2 class="font-semibold text-slate-900">Danger zone</h2>
					<p class="mt-1 text-xs leading-5 text-slate-500">
						Deleting a parent task also soft-deletes its subtasks. Activity history is retained.
					</p>
					<form
						method="POST"
						action="?/delete"
						class="mt-3"
						onsubmit={(event) => {
							if (!confirm(`Delete “${data.task.title}”?`)) event.preventDefault();
						}}
					>
						<button
							type="submit"
							class="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
						>
							<Trash2 class="h-4 w-4" />
							Delete task
						</button>
					</form>
				</section>
			{/if}
		</div>
	</div>
</div>
