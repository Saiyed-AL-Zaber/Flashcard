import { createClient } from "@supabase/supabase-js";

// Supabase dashboard → Project Settings → API
const SUPABASE_URL = "https://ytmexmgqxydzihschrcd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vs-wGHBa5Fe1xL4HykTSpQ_9KA0PxcU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
