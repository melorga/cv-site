<script lang="ts">
	import AuthGate from '$lib/components/AuthGate.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ChatPanel from '$lib/components/ChatPanel.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const initialPrompts = [
		'What is your AWS specialty?',
		'Show me a recent project',
		'Why should we hire you?',
		'Are you open to remote roles?'
	];

	async function handleSignOut() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/';
	}

	function handleAuthenticated() {
		window.location.href = '/';
	}
</script>

<svelte:head>
	<title>Mariano Elorga — AWS Solutions Architect</title>
	<link rel="preconnect" href="https://assets.calendly.com" />
	<link rel="stylesheet" href="https://assets.calendly.com/assets/external/widget.css" />
</svelte:head>

{#if data.user}
	<div class="flex min-h-screen w-full flex-col md:flex-row">
		<Sidebar user={data.user} onSignOut={handleSignOut} />
		<main class="flex-1">
			<ChatPanel {initialPrompts} />
		</main>
	</div>
{:else}
	<AuthGate onAuthenticated={handleAuthenticated} />
{/if}
