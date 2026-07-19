/**
 * Minimal ambient declarations for the Deno APIs used in Supabase Edge Functions.
 * This file exists solely to suppress TypeScript LSP errors in VS Code when editing
 * Edge Functions. The real types come from Deno's runtime — this is never compiled.
 */

declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
  }
  const env: Env;
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

// Allow URL-based imports to not error in the TS LSP
declare module 'https://deno.land/x/jose@v5.2.0/index.ts' {
  export { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
}
