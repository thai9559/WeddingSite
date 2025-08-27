"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const nav = [
  { href: "/", label: "Trang chủ" },
  { href: "/#album-cards", label: "Albums" }, // đã có id này ở page
  { href: "/#gallery", label: "Gallery" }, // nếu muốn cuộn tới WeddingGallery, add id="gallery"
];

const admin = [
  { href: "/admin", label: "Admin" },
  { href: "/admin/upload-albums", label: "Upload Albums" },
  { href: "/admin/upload-banner", label: "Upload Banner" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    // với anchor (#) thì không so strict pathname
    if (href.startsWith("/#")) return false;
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo / Brand */}
        <Link href="/" className="text-[13px] tracking-[0.35em] uppercase">
          Nhut Quang & Hai Yen
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:block">
          <NavigationMenu>
            <NavigationMenuList className="gap-2">
              {nav.map((item) => (
                <NavigationMenuItem key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm transition",
                      isActive(item.href)
                        ? "bg-black text-white"
                        : "text-neutral-700 hover:bg-neutral-100"
                    )}
                  >
                    {item.label}
                  </Link>
                </NavigationMenuItem>
              ))}

              {/* Dropdown “Admin” giản lược: dùng các nút thường */}
              <NavigationMenuItem>
                <div className="flex items-center gap-2">
                  {admin.map((a) => (
                    <Link
                      key={a.href}
                      href={a.href}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm transition",
                        isActive(a.href)
                          ? "bg-black text-white"
                          : "text-neutral-700 hover:bg-neutral-100"
                      )}
                    >
                      {a.label}
                    </Link>
                  ))}
                </div>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        {/* CTA / Actions bên phải (tuỳ chọn) */}
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/#album-cards">
            <Button variant="default" size="sm" className="rounded-full">
              Xem tất cả Albums
            </Button>
          </Link>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle className="text-[12px] tracking-[0.35em] uppercase">
                  Menu
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 grid gap-1">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm",
                      isActive(item.href)
                        ? "bg-black text-white"
                        : "text-neutral-700 hover:bg-neutral-100"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="grid gap-1">
                <div className="px-3 pb-1 text-[11px] uppercase tracking-[0.25em] text-neutral-500">
                  Admin
                </div>
                {admin.map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm",
                      isActive(a.href)
                        ? "bg-black text-white"
                        : "text-neutral-700 hover:bg-neutral-100"
                    )}
                  >
                    {a.label}
                  </Link>
                ))}
              </div>

              <Separator className="my-4" />

              <Link
                href="/#album-cards"
                onClick={() => setOpen(false)}
                className="px-3"
              >
                <Button className="w-full rounded-full" size="sm">
                  Xem tất cả Albums
                </Button>
              </Link>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
