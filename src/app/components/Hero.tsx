// components/Hero.tsx
"use client";
import { useRef, useState } from "react";
import { ForestSlider, ForestSliderHandle, ForestSlide } from "./ForestSlider";

const heroSlides: ForestSlide[] = [
  {
    src: "/images/main-banner.jpg",
    heading: "Our Wedding Day",
    subheading: "A celebration of love",
  },
  {
    src: "/images/main-banner_1.jpg",
    heading: "Our Wedding Day",
    subheading: "A celebration of love",
  },
  {
    src: "/images/main-banner_2.jpg",
    heading: "Captured Moments",
    subheading: "Memories to cherish",
  },
  {
    src: "/images/main-banner_3.jpg",
    heading: "Together Forever",
    subheading: "Join our story",
  },
  {
    src: "/images/main-banner_4.jpg",
    heading: "Happily Ever After",
    subheading: "The journey continues",
  },
  {
    src: "/images/main-banner_5.jpg",
    heading: "Happily Ever After",
    subheading: "The journey continues",
  },
  {
    src: "/images/main-banner_6.jpg",
    heading: "Happily Ever After",
    subheading: "The journey continues",
  },
  {
    src: "/images/main-banner_7.jpg",
    heading: "Happily Ever After",
    subheading: "The journey continues",
  },
  {
    src: "/images/main-banner_8.jpg",
    heading: "Happily Ever After",
    subheading: "The journey continues",
  },
  {
    src: "/images/main-banner_9.jpg",
    heading: "Happily Ever After",
    subheading: "The journey continues",
  },
];

export function Hero() {
  const [index, setIndex] = useState(0);
  const sliderRef = useRef<ForestSliderHandle>(null);

  return (
    <section className="relative h-[100svh] w-full overflow-hidden bg-black">
      <ForestSlider
        ref={sliderRef}
        slides={heroSlides}
        intervalMs={5000}
        intensity={0.6}
        autoplay={false}
        onChange={setIndex}
      />

      {/* Header overlay (không chặn click) */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 text-white mix-blend-difference">
        <div className="pointer-events-auto text-[18px] tracking-[0.4em] uppercase">
          Nhut Quang & Hai Yen
        </div>
        <div className="pointer-events-auto grid size-8 place-items-center">
          <span className="mb-1 block h-px w-5 bg-white" />
          <span className="mb-1 block h-px w-5 bg-white" />
          <span className="block h-px w-5 bg-white" />
        </div>
      </header>

      {/* Dots ở ĐÁY – click để nhảy slide qua ref */}
      <div className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2 flex gap-2">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => sliderRef.current?.jumpTo(i)}
            className={`h-1.5 w-6 rounded-full transition ${
              i === index ? "bg-white" : "bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
