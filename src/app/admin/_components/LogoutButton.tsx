// src/app/admin/_components/LogoutButton.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/app/lib/supabase-browser";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      onClick={async () => {
        try {
          setLoading(true);
          const supabase = supabaseBrowser();
          await supabase.auth.signOut();
          router.push("/login");
        } finally {
          setLoading(false);
        }
      }}
      className="rounded border px-3 py-1"
      disabled={loading}
    >
      {loading ? "Đang đăng xuất..." : "Đăng xuất"}
    </button>
  );
}
