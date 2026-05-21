<script lang="ts">
	import BookingCta from './BookingCta.svelte';

	let {
		onAuthenticated,
		signInImpl
	}: {
		onAuthenticated: () => void;
		signInImpl?: (email: string, password: string, mode: 'login' | 'register') => Promise<void>;
	} = $props();

	let email = $state('');
	let password = $state('');
	let mode: 'login' | 'register' = $state('login');
	let busy = $state(false);
	let error: string | null = $state(null);

	const CALENDLY_URL = 'https://calendly.com/melorga';
	const MAILTO_FALLBACK = 'mailto:hello@melorga.dev?subject=Quick%20chat%20%E2%80%94%2015%20min';

	async function defaultSignIn(em: string, pw: string, m: 'login' | 'register'): Promise<void> {
		const { signIn } = await import('$lib/firebase');
		await signIn(em, pw, m);
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (busy) return;
		error = null;
		if (!email || !password) {
			error = 'Please enter your email and password.';
			return;
		}
		busy = true;
		try {
			await (signInImpl ?? defaultSignIn)(email, password, mode);
			onAuthenticated();
		} catch {
			error = 'Sign-in failed. Try again or reset your password.';
		} finally {
			busy = false;
		}
	}
</script>

<main class="relative flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
	<div class="hero-glow animate-accent-drift pointer-events-none absolute inset-0"></div>
	<div class="animate-fade-in relative flex w-full max-w-md flex-col gap-8">
		<div>
			<div class="text-xs font-bold tracking-widest text-accent">M · E</div>
			<h1 class="mt-3 text-4xl font-bold leading-[0.95] tracking-tight text-fg md:text-5xl">
				Let's talk about<br />your <span class="italic-noslant text-accent">next</span> build.
			</h1>
			<p class="mt-4 text-sm text-fg-muted">
				I architect cloud systems that actually ship. Step inside to chat with my AI assistant, or
				grab time on the calendar.
			</p>
		</div>

		<form onsubmit={submit} class="flex flex-col gap-3">
			<label class="flex flex-col gap-1">
				<span class="text-[11px] uppercase tracking-wider text-fg-subtle">Email</span>
				<input
					type="email"
					bind:value={email}
					autocomplete="email"
					required
					class="rounded-md border border-line bg-canvas-elevated px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent"
				/>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[11px] uppercase tracking-wider text-fg-subtle">Password</span>
				<input
					type="password"
					bind:value={password}
					autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
					required
					minlength="8"
					class="rounded-md border border-line bg-canvas-elevated px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent"
				/>
			</label>

			{#if error}
				<div role="alert" class="text-xs text-accent">{error}</div>
			{/if}

			<div class="mt-1 flex items-center gap-3">
				<button
					type="submit"
					disabled={busy}
					class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
					>{mode === 'login' ? 'Sign in' : 'Create account'} →</button
				>
				<button
					type="button"
					onclick={() => (mode = mode === 'login' ? 'register' : 'login')}
					class="text-xs text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline"
					>{mode === 'login' ? 'Create account' : 'Already have one? Sign in'}</button
				>
			</div>
		</form>

		<div class="flex items-center gap-3 border-t border-line pt-2">
			<span class="text-xs text-fg-subtle">Just want to chat?</span>
			<BookingCta calendlyUrl={CALENDLY_URL} mailtoFallback={MAILTO_FALLBACK} variant="ghost" />
		</div>
	</div>
</main>
