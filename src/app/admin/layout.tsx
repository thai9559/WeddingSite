// app/(admin)/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "default-no-store";

import { redirect } from "next/navigation";
import { supabaseServer } from "../lib/supabase-server";
import { Toaster } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/components/app-sidebar";

export const metadata = {
  title: "Admin",
  description: "Trang quản lý ảnh cưới",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // ❗ Chỉ check login, KHÔNG kiểm tra email admin nữa
  if (!session) redirect("/login");

  return (
    <SidebarProvider>
      {/* Sidebar trái */}
      <AppSidebar />

      {/* Nội dung chính */}
      <div className="flex min-h-screen flex-1 flex-col bg-neutral-100 text-neutral-900">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-white px-4">
          <SidebarTrigger />
          <div className="text-sm font-medium">Admin · Quản lý ảnh cưới</div>
        </header>

        <main className="container mx-auto w-full max-w-[1400px] flex-1 p-4 lg:p-6">
          {children}
          <Toaster position="top-center" richColors />
        </main>
      </div>
    </SidebarProvider>
  );
}
