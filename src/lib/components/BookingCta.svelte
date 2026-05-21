<script lang="ts">
	let {
		calendlyUrl,
		mailtoFallback,
		variant = 'solid'
	}: { calendlyUrl: string; mailtoFallback: string; variant?: 'solid' | 'ghost' } = $props();

	const WIDGET_SRC = 'https://assets.calendly.com/assets/external/widget.js';
	type CalendlyApi = { initPopupWidget: (opts: { url: string }) => void };
	let loadPromise: Promise<CalendlyApi | null> | null = null;

	function getCalendly(): CalendlyApi | undefined {
		return (window as unknown as { Calendly?: CalendlyApi }).Calendly;
	}

	function loadCalendly(): Promise<CalendlyApi | null> {
		if (loadPromise) return loadPromise;
		const existing = getCalendly();
		if (existing) return Promise.resolve(existing);
		loadPromise = new Promise((resolve) => {
			const s = document.createElement('script');
			s.src = WIDGET_SRC;
			s.async = true;
			s.onload = () => resolve(getCalendly() ?? null);
			s.onerror = () => resolve(null);
			document.head.appendChild(s);
		});
		return loadPromise;
	}

	async function openBooking() {
		const Calendly = (await loadCalendly()) ?? getCalendly() ?? null;
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
