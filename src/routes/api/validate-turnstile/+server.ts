import { json } from '@sveltejs/kit';

export async function POST({ request, platform }) {
  const { token } = await request.json();
  const ip = request.headers.get('CF-Connecting-IP') || '';  // For security

  const formData = new FormData();
  formData.append('secret', platform.env.TURNSTILE_SECRET);
  formData.append('response', token);
  formData.append('remoteip', ip);  // Optional, but recommended

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData
  });
  const outcome = await res.json();

  if (outcome.success) {
    // Token valid: Proceed with auth logic (e.g., Firebase login)
    return json({ valid: true });
  } else {
    return json({ valid: false, error: outcome['error-codes'] }, { status: 400 });
  }
}

