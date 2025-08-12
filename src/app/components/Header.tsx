"use client";
import React from "react";

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 mix-blend-difference">
      <div className="text-[18px] tracking-[0.4em] uppercase text-white/90">
        Nhut Quang & Hai Yen
      </div>
      <button
        aria-label="Menu"
        className="size-8 grid place-items-center text-white/90"
      >
        <span className="block h-px w-5 bg-white mb-1" />
        <span className="block h-px w-5 bg-white mb-1" />
        <span className="block h-px w-5 bg-white" />
      </button>
    </header>
  );
}
