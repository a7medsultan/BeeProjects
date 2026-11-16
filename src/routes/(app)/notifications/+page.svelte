<script lang="ts">
	import { Bell } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Notifications · BeeProjects</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-semibold tracking-tight text-slate-900">Notifications</h2>
		<p class="mt-1 text-sm text-slate-500">
			Assignments, comments, mentions, and deadline reminders in one place.
		</p>
	</div>

	<div class="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
		<Bell class="mx-auto h-10 w-10 text-slate-300" />
		<h3 class="mt-4 font-semibold text-slate-900">You're all caught up</h3>
		<p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
			In-app notifications and 30-second polling arrive in milestone M6.
		</p>
	</div>
</div>
