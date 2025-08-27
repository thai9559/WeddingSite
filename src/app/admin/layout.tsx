import { redirect } from "next/navigation";
import { supabaseServer } from "../lib/supabase-server";

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

  if (!session) redirect("/login");

  const email = session.user.email?.toLowerCase();
  const allowed = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!allowed) throw new Error("Missing ADMIN_EMAIL");
  if (email !== allowed) redirect("/login");

  return (
    <SidebarProvider>
      {/* Sidebar trái */}
      <AppSidebar />

      {/* Phần nội dung */}
      <div className="flex min-h-screen flex-1 flex-col bg-neutral-100 text-neutral-900">
        {/* Top bar nhỏ chứa nút mở/đóng sidebar (mobile) */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-white px-4">
          <SidebarTrigger />
          <div className="text-sm font-medium">Admin · Quản lý ảnh cưới</div>
        </header>

        <main className="container mx-auto w-full max-w-[1400px] flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
