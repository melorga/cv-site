<script lang="ts">
	import type { ChatMessage } from '$lib/types';

	let { role, text }: { role: ChatMessage['role']; text: string } = $props();
</script>

<div
	data-role={role}
	class="animate-fade-in flex w-full"
	class:justify-end={role === 'user'}
	class:justify-start={role === 'assistant'}
>
	<div
		class="max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed"
		class:bg-accent={role === 'user'}
		class:text-on-accent={role === 'user'}
		class:font-medium={role === 'user'}
		class:rounded-br-sm={role === 'user'}
		class:bg-canvas-elevated={role === 'assistant'}
		class:text-fg={role === 'assistant'}
		class:border={role === 'assistant'}
		class:border-line={role === 'assistant'}
		class:rounded-bl-sm={role === 'assistant'}
	>
		{text}
	</div>
</div>
