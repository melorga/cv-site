/**
 * Personal-profile constants sourced from VITE_ env vars so they can be
 * configured per-deployment (Pages dashboard or .env.local) without
 * touching the codebase.
 *
 * All values are exposed to the client (VITE_* prefix) — they're public
 * info that already appears on the rendered page. If unset, components
 * gracefully degrade (hide the link/element, fall back to a no-op).
 *
 * The server side reads the same env vars via `platform.env.VITE_*` —
 * see /api/chat for the system-prompt parameterization.
 */

/**
 * Adds a default https:// scheme if missing. Lets the operator paste a bare
 * domain like "calendly.com/me" into the Pages dashboard without breaking
 * relative-URL links.
 */
function normalizeUrl(url: string): string {
	if (!url) return '';
	return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

export const PROFILE_NAME = import.meta.env.VITE_PROFILE_NAME ?? '';
export const PROFILE_ROLE = import.meta.env.VITE_PROFILE_ROLE ?? '';
export const PROFILE_LOCATION = import.meta.env.VITE_PROFILE_LOCATION ?? '';

export const CALENDLY_URL = normalizeUrl(import.meta.env.VITE_CALENDLY_URL ?? '');
export const LINKEDIN_URL = normalizeUrl(import.meta.env.VITE_LINKEDIN_URL ?? '');
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL ?? '';

export const PROFILE_FIRST_NAME = PROFILE_NAME.split(/\s+/)[0] ?? '';
export const PROFILE_INITIAL = PROFILE_FIRST_NAME.charAt(0).toUpperCase();

export const PAGE_TITLE = PROFILE_NAME
	? PROFILE_ROLE
		? `${PROFILE_NAME} — ${PROFILE_ROLE}`
		: PROFILE_NAME
	: 'Personal CV';

export const MAILTO_FALLBACK = CONTACT_EMAIL
	? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Quick chat — 15 min')}`
	: '';
