import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wptsamiwqyvgshrpobto.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_TLiNkJ87fzXG7Y17R2OTtQ_IwzY7SyS";

export const externalSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    storageKey: "external-supabase-auth",
  },
});
