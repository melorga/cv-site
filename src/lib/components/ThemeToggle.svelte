<script lang="ts">
	import { onMount } from 'svelte';

	let isDark = $state(true);

	function applyTheme(dark: boolean) {
		if (typeof document === 'undefined') return;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	}

	function toggle() {
		isDark = !isDark;
		applyTheme(isDark);
	}

	onMount(() => {
		const stored = localStorage.getItem('theme');
		isDark = stored !== 'light';
		applyTheme(isDark);
	});
</script>

<button
	type="button"
	onclick={toggle}
	aria-label="Toggle theme"
	class="inline-flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-canvas-elevated hover:text-fg"
>
	{#if isDark}
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4"></circle>
			<path
				d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
			></path>
		</svg>
	{:else}
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
		</svg>
	{/if}
</button>
