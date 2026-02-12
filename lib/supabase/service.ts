import { createClient } from "@supabase/supabase-js";

/**
 * Service role client — bypasses RLS, only for server-side operations.
 * Never expose this key to the browser.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
