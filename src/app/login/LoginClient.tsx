"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { supabaseBrowser } from "../lib/supabase-browser";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = supabaseBrowser;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        toast.error("Sai tài khoản hoặc mật khẩu ❌");
        console.log(error.message);
      } else {
        toast.success("Đăng nhập thành công 🎉");
        setTimeout(() => router.push("/admin"), 1200);
      }
    } catch (err) {
      toast.error("Lỗi hệ thống. Vui lòng thử lại ⚠️");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-sky-100 relative">
      {/* Toaster dùng global luôn */}
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      <Card className="w-full max-w-sm shadow-xl border border-neutral-200 backdrop-blur-sm bg-white/80">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold text-neutral-800">
            Đăng nhập
          </CardTitle>
          <p className="text-sm text-neutral-500 mt-1">
            Chào mừng bạn quay lại 🎉
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={signInWithPassword}>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="focus-visible:ring-indigo-100"
            />
            <Input
              type="password"
              placeholder="Mật khẩu"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="focus-visible:ring-indigo-100"
            />
            <Button
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition"
            >
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
