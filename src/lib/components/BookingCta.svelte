<script lang="ts">
	let {
		calendlyUrl,
		mailtoFallback,
		variant = 'solid'
	}: { calendlyUrl: string; mailtoFallback: string; variant?: 'solid' | 'ghost' } = $props();

	function openBooking() {
		const Calendly = (
			window as unknown as { Calendly?: { initPopupWidget: (opts: { url: string }) => void } }
		).Calendly;
		if (Calendly && typeof Calendly.initPopupWidget === 'function') {
			Calendly.initPopupWidget({ url: calendlyUrl });
		} else {
			window.location.href = mailtoFallback;
		}
	}
</script>

<button
	type="button"
	onclick={openBooking}
	class="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
	class:bg-accent={variant === 'solid'}
	class:text-on-accent={variant === 'solid'}
	class:bg-transparent={variant === 'ghost'}
	class:text-fg={variant === 'ghost'}
	class:border={variant === 'ghost'}
	class:border-line-strong={variant === 'ghost'}
>
	<span aria-hidden="true">📅</span>
	Book 15 min
</button>
