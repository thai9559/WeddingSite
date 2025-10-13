// src/app/lib/supabase-browser.ts
"use client";

import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
// import type { Database } from "@/types/supabase";

// Nếu có types Database, mở comment dòng dưới:
// export const supabaseBrowser = createPagesBrowserClient<Database>();

export const supabaseBrowser = createPagesBrowserClient();
