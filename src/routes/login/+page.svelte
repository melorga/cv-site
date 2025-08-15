<script lang="ts">
	import { onMount } from 'svelte';
	let token = '';
	onMount(() => {
		(window as { turnstileCallback?: (token: string) => void }).turnstileCallback = (t: string) => {
			token = t;
		}; // Capture token
	});
</script>

<svelte:head>
  <title>Mariano’s AI Assistant — Sign in</title>
  <meta name="description" content="Access Mariano’s personal AI assistant. Private, secure, and fast." />
</svelte:head>

<!-- Hero / Intro -->
<section class="relative w-full overflow-hidden neural-bg high-contrast">
  <div class="absolute inset-0 pointer-events-none">
    <div class="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl animate-pulse"></div>
    <div class="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl animate-pulse"></div>
  </div>
  <div class="relative mx-auto max-w-5xl px-6 py-16 md:py-24">
    <div class="text-center">
      <h1 class="text-3xl md:text-5xl font-semibold tracking-tight text-white/90 neon-text">
        Meet Mariano’s AI Assistant
      </h1>
      <p class="mt-4 text-base md:text-lg text-white/70 max-w-2xl mx-auto">
        A focused, privacy‑first assistant trained to help you learn more about Mariano’s work, skills, and projects.
        Secure access protected by Cloudflare Turnstile.
      </p>
      <div class="mt-6 flex items-center justify-center gap-3 text-sm text-white/60">
        <span class="inline-flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-emerald-400"></span> Secure</span>
        <span class="inline-flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-cyan-400"></span> Fast</span>
        <span class="inline-flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-fuchsia-400"></span> Private</span>
      </div>
    </div>
  </div>
</section>
<div
	class="cf-turnstile mx-auto mt-8 flex justify-center"
	data-sitekey={import.meta.env.VITE_TURNSTILE_SITEKEY}
	data-callback="turnstileCallback"
></div>

<form
	class="mx-auto mt-6 max-w-md rounded-2xl glass-dark p-6 shadow-xl border border-white/10"
	on:submit|preventDefault={async () => {
		if (!token) return alert('Complete CAPTCHA');
		// Send token to server via fetch to your +server.ts
		const res = await fetch('/api/validate-turnstile', {
			method: 'POST',
			body: JSON.stringify({ token })
		});
		if (res.ok) {
			/* Proceed with auth */
		}
	}}
>
	<h2 class="text-lg font-medium text-white/90">Sign in to continue</h2>
	<p class="mt-2 text-sm text-white/60">
		Verify you’re human to start a conversation with Mariano’s AI. No passwords, no emails — just a quick check.
	</p>

	<!-- Form fields (none needed for Turnstile-only flow) -->

	<button
		type="submit"
		class="mt-5 w-full rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-4 py-2.5 font-medium text-white shadow-lg shadow-fuchsia-500/20 hover:from-cyan-400 hover:to-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-cyan-300"
	>
		Continue
	</button>

	<p class="mt-4 text-xs text-white/50">
		By continuing, you agree to a respectful use of the assistant. We do not store personal data without consent.
	</p>
</form>
