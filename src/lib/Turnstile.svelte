<script lang="ts">
	import { onMount } from 'svelte';
	const sitekey = import.meta.env.VITE_TURNSTILE_SITEKEY;
	onMount(() => {
		const s = document.createElement('script');
		s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
		s.async = true;
		s.defer = true;
		document.head.appendChild(s);
	});
</script>

<div class="cf-turnstile" data-sitekey={sitekey} data-theme="auto"></div>
