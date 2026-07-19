/// <reference path="./deno.d.ts" />

// @ts-ignore – URL imports resolve at runtime in Supabase Edge Functions (Deno)
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'https://deno.land/x/jose@v5.2.0/index.ts';

const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') || 'reddif-3c66c';

// Google's public key endpoint for Firebase Auth tokens (RS256)
const GOOGLE_JWKS_URI =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URI));

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, apikey, x-client-info',
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  // ── CORS preflight ──────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firebase_token } = await req.json();

    if (!firebase_token) {
      return jsonResponse({ error: 'firebase_token is required' }, 400);
    }

    // ── 1. Verify the Firebase ID token ─────────────────────────────
    const { payload } = await jwtVerify(firebase_token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });

    const firebaseUid = payload.sub;
    if (!firebaseUid) {
      return jsonResponse({ error: 'Invalid token: missing sub claim' }, 401);
    }

    // ── 2. Create a Supabase-compatible JWT ─────────────────────────
    const supabaseJwtSecret = Deno.env.get('SUPABASE_JWT_SECRET') || Deno.env.get('CUSTOM_JWT_SECRET');
    if (!supabaseJwtSecret) {
      console.error('Neither SUPABASE_JWT_SECRET nor CUSTOM_JWT_SECRET is set');
      return jsonResponse({ error: 'Server configuration error' }, 500);
    }

    const secret = new TextEncoder().encode(supabaseJwtSecret);

    const supabaseToken = await new SignJWT({
      sub: firebaseUid,
      role: 'authenticated',
      aud: 'authenticated',
      iss: 'supabase',
      email: (payload.email as string) || null,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    return jsonResponse({ token: supabaseToken });
  } catch (error) {
    console.error('Token exchange error:', error);
    const message =
      error instanceof Error ? error.message : 'Token verification failed';
    return jsonResponse({ error: message }, 401);
  }
});
