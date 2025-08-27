"use client";

import { useState } from "react";
import { supabaseBrowser } from "../lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password: pass,
    });
    setLoading(false);
    if (error) return setMsg(error.message);
    if (!error) {
      // router.push("/admin");
      window.location.href = "/admin";
    }
  }

  async function signInWithMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabaseBrowser.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/admin` },
    });
    setLoading(false);
    setMsg(error ? error.message : "Đã gửi link đăng nhập. Kiểm tra email!");
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabaseBrowser.auth.signUp({
      email,
      password: pass,
    });
    setLoading(false);
    setMsg(
      error ? error.message : "Tạo tài khoản thành công. Bạn có thể đăng nhập."
    );
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold">Đăng nhập</h1>
      <form className="mt-5 space-y-3" onSubmit={signInWithPassword}>
        <input
          className="w-full rounded border p-2"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border p-2"
          placeholder="Mật khẩu"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <button
          disabled={loading}
          className="w-full rounded bg-black py-2 text-white"
        >
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </button>
        <button
          onClick={signUp}
          type="button"
          className="w-full rounded border py-2"
        >
          Đăng ký (email + password)
        </button>
        <button
          onClick={signInWithMagicLink}
          type="button"
          className="w-full rounded border py-2"
        >
          Gửi magic link
        </button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </form>
    </main>
  );
}
