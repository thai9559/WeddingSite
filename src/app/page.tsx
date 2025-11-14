"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Hero } from "./components/Hero";
import { Approach } from "./components/Approach";
import Albums from "./components/Cards";
import { SiteFooter } from "./components/SiteFooter";
import WeddingIntro from "./components/WeddingIntro";
import { makeWeddingData } from "./lib/wedding.mapper";
import { weddingInput } from "./data/wedding.data";
import Link from "next/link";

export default function Home() {
  const [showIntro, setShowIntro] = useState(false);
  const [mounted, setMounted] = useState(false);
  const data = makeWeddingData(weddingInput);

  useEffect(() => {
    setMounted(true);

    const hasSeenIntro =
      typeof window !== "undefined"
        ? localStorage.getItem("wedding-intro-seen")
        : null;

    if (hasSeenIntro !== "true") {
      setTimeout(() => {
        setShowIntro(true);
      }, 100);
    }
    //     setTimeout(() => {
    //   setShowIntro(true);
    // }, 100);
  }, []);

  const handleIntroComplete = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wedding-intro-seen", "true");
    }
    setShowIntro(false);
  };
  // Sau khi xong roi thi moi open len
  // const handleIntroComplete = () => {

  //   setShowIntro(false);
  // };
  return (
    <>
      {showIntro && <WeddingIntro onComplete={handleIntroComplete} />}
      <main className="bg-white text-neutral-800">
        <Hero />

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
            Vui lòng xác nhận giúp tụi mình trước ngày 30/11 nhé 💐
          </p>

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
