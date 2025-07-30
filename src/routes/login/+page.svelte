<script>
  import { onMount } from 'svelte';
  let token = '';
  onMount(() => {
    window.turnstileCallback = (t) => { token = t; };  // Capture token
  });
</script>

<div class="cf-turnstile" data-sitekey={import.meta.env.VITE_TURNSTILE_SITEKEY} data-callback="turnstileCallback"></div>

<form on:submit|preventDefault={async () => {
  if (!token) return alert('Complete CAPTCHA');
  // Send token to server via fetch to your +server.ts
  const res = await fetch('/api/validate-turnstile', {
    method: 'POST',
    body: JSON.stringify({ token })
  });
  if (res.ok) { /* Proceed with auth */ }
}}>
  <!-- Form fields -->
  <button type="submit">Submit</button>
</form>

