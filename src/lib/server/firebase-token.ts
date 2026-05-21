/**
 * Firebase Auth ID-token verification (edge-runtime safe).
 *
 * Firebase ID tokens are RS256-signed JWTs whose issuer is Firebase, NOT Google
 * OIDC. Google's tokeninfo endpoint (oauth2/v3/tokeninfo) does NOT validate them
 * — it rejects with 401 because the issuer doesn't match an OIDC issuer.
 *
 * Per Firebase docs (https://firebase.google.com/docs/auth/admin/verify-id-tokens):
 *
 * - alg = RS256
 * - kid must match a key from
 *   https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com
 * - iss = "https://securetoken.google.com/<projectId>"
 * - aud = "<projectId>"
 * - exp must be in the future, iat must be in the past, sub must be non-empty
 *
 * jose handles the cache + rotation + signature + standard claim checks
 * (iss, aud, exp, iat). We only add a sub non-empty assertion below.
 */

import { jwtVerify, createRemoteJWKSet, errors as joseErrors } from 'jose';

const JWKS = createRemoteJWKSet(
	new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export interface FirebaseUser {
	uid: string;
	email: string | null;
}

export async function verifyFirebaseIdToken(
	idToken: string,
	projectId: string
): Promise<FirebaseUser | null> {
	if (!idToken || !projectId) return null;
	try {
		const { payload } = await jwtVerify(idToken, JWKS, {
			issuer: `https://securetoken.google.com/${projectId}`,
			audience: projectId,
			algorithms: ['RS256']
		});
		const uid = typeof payload.sub === 'string' ? payload.sub : '';
		if (uid.length === 0) return null;
		const email = typeof payload.email === 'string' ? payload.email : null;
		return { uid, email };
	} catch (err) {
		if (
			err instanceof joseErrors.JWTExpired ||
			err instanceof joseErrors.JWTClaimValidationFailed ||
			err instanceof joseErrors.JWSSignatureVerificationFailed ||
			err instanceof joseErrors.JWSInvalid ||
			err instanceof joseErrors.JWKSNoMatchingKey
		) {
			return null;
		}
		// Network / JWKS fetch failure — surface as null but log for observability
		console.warn('[firebase-token] verification error:', err);
		return null;
	}
}

/**
 * Extracts the Firebase project ID from a VITE_FIREBASE_CONFIG JSON blob.
 * Returns null if the blob is missing, unparseable, or has no projectId.
 */
export function projectIdFromConfig(configJson: string | undefined): string | null {
	if (!configJson) return null;
	try {
		const parsed = JSON.parse(configJson) as { projectId?: unknown };
		return typeof parsed.projectId === 'string' && parsed.projectId.length > 0
			? parsed.projectId
			: null;
	} catch {
		return null;
	}
}
