// src/app/components/LogoutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createPagesBrowserClient();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        try {
          localStorage.removeItem("rsvp_draft");
          sessionStorage.removeItem("some_temp_state");
        } catch {}

        router.replace("/login");
        router.refresh();
      }}
      className="flex w-full items-center cursor-pointer gap-2 rounded-lg  text-left hover:bg-neutral-100"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
        <path
          d="M16 17l5-5-5-5M21 12H9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span>Đăng xuất</span>
    </button>
  );
}
