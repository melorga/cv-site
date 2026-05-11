<script>
	import '../app.css';
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>

	<meta name="theme-color" content="#111111" />
	<meta name="color-scheme" content="dark light" />

	<!-- Open Graph -->
	<meta property="og:title" content="Mariano Elorga — AWS Solutions Architect" />
	<meta
		property="og:description"
		content="AI-assisted CV with a chat that knows my work, projects, and how I think."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://melorga.pages.dev/" />
	<meta property="og:image" content="https://melorga.pages.dev/og-image.jpg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Mariano Elorga — AWS Solutions Architect" />
	<meta
		name="twitter:description"
		content="AI-assisted CV with a chat that knows my work, projects, and how I think."
	/>
	<meta name="twitter:image" content="https://melorga.pages.dev/og-image.jpg" />
</svelte:head>

<slot />
