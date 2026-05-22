<script lang="ts">
	let { prompts, onSelect }: { prompts: string[]; onSelect: (text: string) => void } = $props();
</script>

{#if prompts.length > 0}
	<div class="flex flex-wrap justify-center gap-2">
		{#each prompts as prompt (prompt)}
			<button
				type="button"
				onclick={() => onSelect(prompt)}
				class="rounded-full border border-line bg-canvas-elevated px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent hover:text-fg"
			>
				{prompt}
			</button>
		{/each}
	</div>
{/if}
