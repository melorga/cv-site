<script lang="ts">
	import type { ChatMessage } from '$lib/types';
	import MessageBubble from './MessageBubble.svelte';
	import SuggestionChips from './SuggestionChips.svelte';
	import BookingCta from './BookingCta.svelte';

	let { initialPrompts }: { initialPrompts: string[] } = $props();

	let messages: ChatMessage[] = $state([]);
	let draft = $state('');
	let inflight = $state(false);
	let error: string | null = $state(null);
	let listEl: HTMLDivElement | undefined = $state();

	const CALENDLY_URL = 'https://calendly.com/mariano-elorga/15min';
	const MAILTO_FALLBACK = 'mailto:hello@melorga.dev?subject=Quick%20chat%20%E2%80%94%2015%20min';

	async function send(text: string) {
		const trimmed = text.trim();
		if (!trimmed || inflight) return;

		messages = [...messages, { role: 'user', text: trimmed, timestamp: new Date() }];
		draft = '';
		inflight = true;
		error = null;

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: trimmed })
			});
			if (!res.ok) {
				if (res.status === 429) {
					error = "Slow down — you've sent a lot recently. Try again in a moment.";
				} else if (res.status === 403) {
					error = 'Your session needs to refresh. Please sign in again.';
				} else {
					error = 'The assistant is taking a moment. Try again?';
				}
				return;
			}
			const data = (await res.json()) as { response: string };
			messages = [...messages, { role: 'assistant', text: data.response, timestamp: new Date() }];
		} catch {
			error = 'Network error — check your connection.';
		} finally {
			inflight = false;
			queueMicrotask(() => {
				listEl?.scrollTo({ top: listEl.scrollHeight, behavior: 'smooth' });
			});
		}
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		send(draft);
	}
</script>

<section class="flex h-full w-full flex-col">
	<header class="flex items-center justify-between border-b border-line px-6 py-3">
		<div class="text-xs font-bold tracking-widest text-accent">M · E</div>
		<BookingCta calendlyUrl={CALENDLY_URL} mailtoFallback={MAILTO_FALLBACK} />
	</header>

	<div bind:this={listEl} class="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
		{#if messages.length === 0}
			<div class="mx-auto max-w-prose pt-6 hero-glow">
				<div class="text-3xl font-bold tracking-tight text-fg leading-tight md:text-4xl">
					Ask me <span class="text-accent">anything</span>.
				</div>
				<p class="mt-3 text-sm text-fg-muted">
					I'm Mariano — AWS Solutions Architect. The AI knows my work, projects, and how I think. Or
					grab a quick call on the calendar.
				</p>
			</div>
		{:else}
			<div class="mx-auto flex max-w-prose flex-col gap-3">
				{#each messages as msg, i (i + msg.timestamp.toISOString())}
					<MessageBubble role={msg.role} text={msg.text} />
				{/each}
				{#if inflight}
					<div class="px-1 text-xs italic text-fg-subtle">thinking…</div>
				{/if}
			</div>
		{/if}
	</div>

	<footer class="border-t border-line px-6 py-4">
		<div class="mx-auto flex max-w-prose flex-col gap-3">
			<SuggestionChips prompts={initialPrompts} onSelect={(p) => send(p)} />

			{#if error}
				<div role="alert" class="text-xs text-accent">{error}</div>
			{/if}

			<form
				onsubmit={handleSubmit}
				class="flex items-center gap-2 rounded-full border border-line bg-canvas-elevated py-1.5 pl-4 pr-1.5 transition-colors focus-within:border-accent"
			>
				<input
					type="text"
					bind:value={draft}
					placeholder="Ask anything about Mariano…"
					autocomplete="off"
					maxlength="1000"
					disabled={inflight}
					class="flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle disabled:opacity-50"
				/>
				<button
					type="submit"
					disabled={inflight || !draft.trim()}
					aria-label="Send"
					class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent font-bold text-on-accent transition-opacity disabled:opacity-40"
					>↑</button
				>
			</form>
		</div>
	</footer>
</section>
