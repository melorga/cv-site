# CV Site Setup Instructions

## Quick Fix for GROQ API Key Error

You're currently seeing "Invalid API Key" errors because the GROQ API key needs to be configured. Here's how to fix it:

### Option 1: Using .dev.vars file (Recommended for Development)

1. **Get a GROQ API Key**:
   - Go to https://groq.com/
   - Sign up for an account
   - Navigate to the API section
   - Generate a new API key

2. **Configure the .dev.vars file**:
   ```bash
   # Edit the .dev.vars file in the project root
   nano .dev.vars
   ```
   
   Replace `your-groq-api-key-here` with your actual API key:
   ```
   GROQ_API_KEY=gsk_your_actual_api_key_here
   TURNSTILE_SECRET=your-turnstile-secret-here
   ```

3. **Restart the development server**:
   ```bash
   # Stop the current wrangler process (Ctrl+C)
   # Then restart it
   pnpm wrangler pages dev .svelte-kit/cloudflare --live-reload --persist-to .wrangler/state/v3/pages/dev/cv-site/kv/
   ```

### Option 2: Using Environment Variables

Alternatively, you can set the environment variable directly in your terminal:

```bash
export GROQ_API_KEY="gsk_your_actual_api_key_here"
pnpm wrangler pages dev .svelte-kit/cloudflare --live-reload --persist-to .wrangler/state/v3/pages/dev/cv-site/kv/
```

## Verification

After setting up the API key correctly, you should see:
- No more "Invalid API Key" errors in the server console
- The chat responding with intelligent answers about Mariano's CV
- Server logs showing "Groq API response received" instead of authentication errors

## Current Status

✅ **Working:**
- Site loads with beautiful interface
- Firebase authentication (falls back to dev mode)
- Chat UI with proper styling
- API endpoints responding
- CV data embeddings stored in KV
- Error logging and debugging

❌ **Needs Configuration:**
- GROQ API key (this is the only missing piece!)

## Troubleshooting

If you still see errors after setting the API key:

1. **Check the .dev.vars file exists** and has the correct format
2. **Restart Wrangler** completely (Ctrl+C and restart)
3. **Verify the API key** is valid by testing it directly with GROQ's API
4. **Check the server logs** - they will now show exactly what's wrong

The site is 99% complete and just needs this one configuration step!
