"use client";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await supabaseBrowser.auth.signOut();
        router.push("/login");
      }}
      className="rounded border px-3 py-1"
    >
      Đăng xuất
    </button>
  );
}
