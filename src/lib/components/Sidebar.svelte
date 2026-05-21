<script lang="ts">
	import type { User } from '$lib/types';
	import ThemeToggle from './ThemeToggle.svelte';

	let { user, onSignOut }: { user: User; onSignOut: () => void } = $props();
</script>

<aside
	class="flex w-full flex-col gap-6 border-line bg-canvas-deep p-6 border-b md:h-full md:w-72 md:min-w-72 md:border-b-0 md:border-r"
>
	<div class="flex flex-col gap-3">
		<div
			class="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-orange-700"
			aria-hidden="true"
		></div>
		<div>
			<div class="text-sm font-semibold text-fg leading-tight">Mariano Elorga</div>
			<div class="text-xs text-fg-muted mt-0.5">AWS Solutions Architect</div>
		</div>
		<div class="text-[11px] text-fg-subtle">Madrid · Open to roles</div>
	</div>

	<nav class="flex flex-col gap-1.5">
		<a
			href="https://www.linkedin.com/in/mariano-elorga"
			rel="noopener noreferrer"
			target="_blank"
			class="text-xs text-fg-muted hover:text-accent transition-colors">LinkedIn ↗</a
		>
		<a
			href="https://calendly.com/melorga"
			rel="noopener noreferrer"
			target="_blank"
			class="text-xs text-fg-muted hover:text-accent transition-colors">Calendar ↗</a
		>
	</nav>

	<div class="flex-1"></div>

	<div class="flex flex-col gap-3 text-[11px] text-fg-subtle">
		<div>Signed in as {user.email ?? 'anonymous'}</div>
		<div class="flex items-center justify-between">
			<button
				type="button"
				onclick={onSignOut}
				class="text-xs text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline"
				>Sign out</button
			>
			<ThemeToggle />
		</div>
	</div>
</aside>
