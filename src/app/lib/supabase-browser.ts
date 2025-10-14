// src/app/lib/supabase-browser.ts
"use client";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

let _client: ReturnType<typeof createPagesBrowserClient> | null = null;

export function supabaseBrowser() {
    if (_client) return _client;
    _client = createPagesBrowserClient();
    return _client;
}
