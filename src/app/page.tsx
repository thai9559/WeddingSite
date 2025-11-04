// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Hero } from "./components/Hero";
import { Approach } from "./components/Approach";
import Albums from "./components/Cards";
import { SiteFooter } from "./components/SiteFooter";
import WeddingIntro from "./components/WeddingIntro";
// import WeddingGallery from "./components/WeddingGallery";
import { makeWeddingData } from "./lib/wedding.mapper";
import { weddingInput } from "./data/wedding.data";
import Link from "next/link";

export default function Home() {
  const [showIntro, setShowIntro] = useState(false); // Bắt đầu với false để tránh flash
  const [mounted, setMounted] = useState(false);
  const data = makeWeddingData(weddingInput);

  // Check localStorage sau khi component mount (chỉ chạy trên client)
  useEffect(() => {
    setMounted(true);

    // DEBUG: Để test, có thể comment dòng này và uncomment dòng dưới
    // localStorage.removeItem("wedding-intro-seen"); // Uncomment để test lại intro

    // Chỉ check localStorage sau khi component đã mount
    const hasSeenIntro =
      typeof window !== "undefined"
        ? localStorage.getItem("wedding-intro-seen")
        : null;

    // Luôn hiển thị intro nếu chưa có flag (hoặc để test)
    if (hasSeenIntro !== "true") {
      // Delay nhỏ để đảm bảo DOM đã render
      setTimeout(() => {
        setShowIntro(true);
      }, 100);
    }
  }, []);

  const handleIntroComplete = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wedding-intro-seen", "true");
    }
    setShowIntro(false);
  };

  return (
    <>
      {showIntro && <WeddingIntro onComplete={handleIntroComplete} />}
      <main className="bg-white text-neutral-800">
        <Hero />
        {/* <WeddingGallery data={data} /> */}
        <div className="text-center my-16 relative">
          <p className="text-sm md:text-base text-neutral-500 mb-3">
            Chúng mình rất mong được đón tiếp bạn trong ngày trọng đại này ✨
          </p>
          <Link
            href="/rsvp"
            className="inline-block bg-black text-white px-8 py-3 rounded-full text-lg font-medium tracking-wide shadow-md hover:-translate-y-0.5 hover:shadow-lg hover:bg-neutral-800 transition-all duration-200"
          >
            Đăng ký tham dự 💌
          </Link>
          <p className="mt-3 text-xs text-neutral-400">
            Vui lòng xác nhận giúp tụi mình trước ngày 01/11 nhé 💐
          </p>

          {/* Hiệu ứng nền nhẹ nhàng */}
          <div className="absolute -z-10 inset-0 flex justify-center items-center opacity-20">
            <div className="w-48 h-48 bg-pink-100 rounded-full blur-3xl animate-pulse" />
            <div className="w-32 h-32 bg-amber-100 rounded-full blur-2xl animate-pulse delay-300" />
          </div>
        </div>

        <Approach />
        <section id="album-cards" className="scroll-mt-24">
          <Albums />
        </section>
        <SiteFooter />
      </main>
    </>
  );
}
