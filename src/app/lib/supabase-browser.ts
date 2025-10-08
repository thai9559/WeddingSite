"use client";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
// (tùy) import type { Database } from "@/types/supabase";

let _client: ReturnType<typeof createPagesBrowserClient> | null = null;
// Nếu có Database types: ReturnType<typeof createPagesBrowserClient<Database>>

export function supabaseBrowser() {
    if (_client) return _client;
    _client = createPagesBrowserClient(); // hoặc <Database>()
    return _client;
}
