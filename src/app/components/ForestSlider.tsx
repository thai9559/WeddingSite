"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants, Transition } from "framer-motion";

export type ForestSlide = {
  src: string;
  heading?: string;
  subheading?: string;
  alt?: string;
};

export type ForestSliderHandle = {
  jumpTo: (i: number) => void;
  next: () => void;
  prev: () => void;
  getIndex: () => number;
};

type Props = {
  slides: ForestSlide[];
  /** thời gian auto next */
  intervalMs?: number;
  /** 0..1: cường độ Ken Burns (scale & blur) */
  intensity?: number;
  /** tự chạy */
  autoplay?: boolean;
  /** báo ra index khi đổi slide */
  onChange?: (index: number) => void;
};

export const ForestSlider = forwardRef<ForestSliderHandle, Props>(
  function ForestSlider(
    { slides, intervalMs = 5000, intensity = 0.6, autoplay = true, onChange },
    ref
  ) {
    const count = slides.length;
    const [index, setIndex] = useState(0);
    const [dir, setDir] = useState<1 | -1>(1);
    const [isAnimating, setIsAnimating] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const hoverRef = useRef(false);
    const pendingRef = useRef<number | null>(null);
    const startX = useRef<number | null>(null);

    // Easing & transitions
    const easeCubic = useMemo(
      () => [0.16, 1, 0.3, 1] as [number, number, number, number],
      []
    );
    const transitionIn: Transition = useMemo(
      () => ({ duration: 0.9, ease: easeCubic }),
      [easeCubic]
    );
    const transitionOut: Transition = useMemo(
      () => ({ duration: 0.7, ease: easeCubic }),
      [easeCubic]
    );

    // ===== Core navigation (định nghĩa TRƯỚC khi dùng ở nơi khác) =====
    const go = useCallback(
      (delta: 1 | -1) => {
        if (isAnimating) return;
        setIsAnimating(true);
        setDir(delta);
        setIndex((i) => (i + delta + count) % count);
      },
      [count, isAnimating]
    );

    const jumpTo = useCallback(
      (i: number) => {
        if (i < 0 || i >= count) return;
        if (i === index) return;
        if (isAnimating) {
          pendingRef.current = i; // xếp hàng nếu đang animate
          return;
        }
        setDir(i > index ? 1 : -1);
        setIsAnimating(true);
        setIndex(i);
      },
      [count, index, isAnimating]
    );

    const next = useCallback(() => go(1), [go]);
    const prev = useCallback(() => go(-1), [go]);
    // ==================================================================

    // Imperative API cho Hero (sau khi đã có go/jumpTo/next/prev)
    useImperativeHandle(
      ref,
      () => ({
        jumpTo,
        next,
        prev,
        getIndex: () => index,
      }),
      [jumpTo, next, prev, index]
    );

    // Autoplay: set/reset mỗi khi index đổi (và khi bật/tắt autoplay)
    const resetTimer = useCallback(() => {
      if (!autoplay) return;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (!hoverRef.current && !isAnimating) {
          go(1);
        }
      }, intervalMs);
    }, [autoplay, intervalMs, isAnimating, go]);

    useEffect(() => {
      onChange?.(index);
      resetTimer();
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [index, onChange, resetTimer]);

    // Touch / swipe
    const handleTouchStart = (x: number) => (startX.current = x);
    const handleTouchMove = (x: number) => {
      const s = startX.current;
      if (s == null) return;
      const dx = x - s;
      if (Math.abs(dx) > 70) {
        dx < 0 ? next() : prev();
        startX.current = null;
      }
    };

    // Variants: prev = next mượt, không đảo DOM
    const MAX_SCALE = 1 + 0.12 * intensity; // 1.0 .. ~1.12
    const MIN_SCALE = 1 - 0.04 * intensity; // 1.0 .. ~0.96
    const BLUR_IN = 8 * intensity; // px

    const variants: Variants = useMemo(
      () => ({
        enter: (direction: 1 | -1) => ({
          opacity: 0,
          scale: direction === 1 ? MAX_SCALE : MIN_SCALE,
          filter: `blur(${Math.max(2, BLUR_IN - 2)}px)`,
        }),
        center: {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          transition: transitionIn,
        },
        exit: (direction: 1 | -1) => ({
          opacity: 0,
          scale: direction === 1 ? 1.02 * MAX_SCALE : 1.0,
          filter: `blur(${BLUR_IN}px)`,
          transition: transitionOut,
        }),
      }),
      [BLUR_IN, MAX_SCALE, MIN_SCALE, transitionIn, transitionOut]
    );

    // Progress animation key
    const [progressKey, setProgressKey] = useState(0);
    useEffect(() => {
      setProgressKey((k) => k + 1);
    }, [index, intervalMs]);

    // Safety: tránh kẹt isAnimating (edge case)
    useEffect(() => {
      if (!isAnimating) return;
      const t = setTimeout(() => setIsAnimating(false), 1500);
      return () => clearTimeout(t);
    }, [isAnimating]);

    return (
      <section
        className="relative h-[100svh] w-full overflow-hidden bg-black"
        onMouseEnter={() => (hoverRef.current = true)}
        onMouseLeave={() => (hoverRef.current = false)}
        onTouchStart={(e) => handleTouchStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleTouchMove(e.touches[0].clientX)}
        onTouchEnd={() => (startX.current = null)}
      >
        {/* Slides */}
        <div className="absolute inset-0">
          <AnimatePresence
            initial={false}
            custom={dir}
            mode="popLayout"
            onExitComplete={() => {
              setIsAnimating(false);
              // nếu có yêu cầu chờ, thực hiện ngay khi xong animation
              if (pendingRef.current != null) {
                const i = pendingRef.current;
                pendingRef.current = null;
                jumpTo(i);
              }
            }}
          >
            <motion.div
              key={index}
              className="absolute inset-0"
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <Image
                src={slides[index].src}
                alt={
                  slides[index].alt ||
                  slides[index].heading ||
                  `Slide ${index + 1}`
                }
                fill
                priority
                sizes="100vw"
                className="object-cover will-change-transform"
              />

              {(slides[index].heading || slides[index].subheading) && (
                <div className="absolute inset-x-0 top-[18%] z-20 mx-auto max-w-6xl px-6 text-white drop-shadow-[0_6px_14px_rgba(0,0,0,0.4)]">
                  {slides[index].heading && (
                    <motion.h2
                      className="text-5xl font-bold leading-tight md:text-7xl"
                      initial={{ y: 40, opacity: 0 }}
                      animate={{
                        y: 0,
                        opacity: 1,
                        transition: { duration: 0.7, ease: easeCubic },
                      }}
                      exit={{
                        y: -40,
                        opacity: 0,
                        transition: { duration: 0.5, ease: easeCubic },
                      }}
                    >
                      {slides[index].heading}
                    </motion.h2>
                  )}
                  {slides[index].subheading && (
                    <motion.p
                      className="mt-3 max-w-xl text-base text-white/85 md:text-lg"
                      initial={{ y: 24, opacity: 0 }}
                      animate={{
                        y: 0,
                        opacity: 1,
                        transition: {
                          duration: 0.6,
                          ease: easeCubic,
                          delay: 0.05,
                        },
                      }}
                      exit={{
                        y: -24,
                        opacity: 0,
                        transition: { duration: 0.45, ease: easeCubic },
                      }}
                    >
                      {slides[index].subheading}
                    </motion.p>
                  )}
                </div>
              )}

              {/* vignette */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.35)_100%)]" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Arrows */}
        <div className="absolute inset-y-0 left-0 right-0 z-30 flex items-center justify-between px-3">
          <button
            onClick={prev}
            disabled={isAnimating}
            aria-label="Previous"
            className="grid size-10 place-items-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50 disabled:opacity-40"
          >
            ‹
          </button>
          <button
            onClick={next}
            disabled={isAnimating}
            aria-label="Next"
            className="grid size-10 place-items-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50 disabled:opacity-40"
          >
            ›
          </button>
        </div>

        {/* Segmented progress ở TOP (click được) */}
        <div className="absolute left-0 right-0 top-0 z-30 flex gap-2 px-4 py-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => (i === index ? null : jumpTo(i))}
              aria-label={`Go to slide ${i + 1}`}
              className="group relative h-[3px] flex-1 overflow-hidden rounded bg-white/20"
              disabled={isAnimating}
            >
              <span
                key={i === index ? progressKey : `idle-${i}`}
                className={`absolute inset-y-0 left-0 block ${
                  i === index
                    ? "bg-white"
                    : "bg-white/40 group-hover:bg-white/60"
                }`}
                style={
                  i === index && autoplay
                    ? {
                        width: "0%",
                        animation: `progress ${intervalMs}ms linear forwards`,
                      }
                    : { width: i < index ? "100%" : "0%" }
                }
              />
            </button>
          ))}
        </div>

        <style jsx global>{`
          @keyframes progress {
            from {
              width: 0%;
            }
            to {
              width: 100%;
            }
          }
        `}</style>
      </section>
    );
  }
);
