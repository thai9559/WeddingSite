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
  blurDataURL?: string;
};

export type ForestSliderHandle = {
  jumpTo: (i: number) => void;
  next: () => void;
  prev: () => void;
  getIndex: () => number;
};

type Props = {
  slides: ForestSlide[];
  intervalMs?: number;
  intensity?: number; // 0..1
  autoplay?: boolean;
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

    // easing
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

    // navigation
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
          pendingRef.current = i;
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

    useImperativeHandle(
      ref,
      () => ({ jumpTo, next, prev, getIndex: () => index }),
      [jumpTo, next, prev, index]
    );

    // pause when offscreen / background
    const rootRef = useRef<HTMLDivElement | null>(null);

    const visibleRef = useRef(true);
    useEffect(() => {
      const el = rootRef.current;
      if (!el) return;
      const io = new IntersectionObserver(
        ([e]) => (visibleRef.current = e.isIntersecting),
        { threshold: 0.1 }
      );
      io.observe(el);
      const onVis = () => (visibleRef.current = !document.hidden);
      document.addEventListener("visibilitychange", onVis);
      return () => {
        io.disconnect();
        document.removeEventListener("visibilitychange", onVis);
      };
    }, []);

    // ✅ chỉ còn MỘT resetTimer – có kiểm tra visibleRef
    const resetTimer = useCallback(() => {
      if (!autoplay) return;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (!hoverRef.current && !isAnimating && visibleRef.current) {
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

    // touch
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

    // variants
    const MAX_SCALE = 1 + 0.12 * intensity;
    const MIN_SCALE = 1 - 0.04 * intensity;
    const variants: Variants = useMemo(
      () => ({
        enter: (direction: 1 | -1) => ({
          opacity: 0,
          scale: direction === 1 ? MAX_SCALE : MIN_SCALE,
        }),
        center: { opacity: 1, scale: 1, transition: transitionIn },
        exit: (direction: 1 | -1) => ({
          opacity: 0,
          scale: direction === 1 ? 1.02 * MAX_SCALE : 1.0,
          transition: transitionOut,
        }),
      }),
      [MAX_SCALE, MIN_SCALE, transitionIn, transitionOut]
    );

    // progress bar key
    const [progressKey, setProgressKey] = useState(0);
    useEffect(() => {
      setProgressKey((k) => k + 1);
    }, [index, intervalMs]);

    // safety
    useEffect(() => {
      if (!isAnimating) return;
      const t = setTimeout(() => setIsAnimating(false), 1500);
      return () => clearTimeout(t);
    }, [isAnimating]);

    return (
      <section
        ref={rootRef}
        className="relative h-full w-full overflow-hidden bg-black"
        onMouseEnter={() => (hoverRef.current = true)}
        onMouseLeave={() => (hoverRef.current = false)}
        onTouchStart={(e) => handleTouchStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleTouchMove(e.touches[0].clientX)}
        onTouchEnd={() => (startX.current = null)}
      >
        <div className="absolute inset-0">
          <AnimatePresence
            initial={false}
            custom={dir}
            mode="popLayout"
            onExitComplete={() => {
              setIsAnimating(false);
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
              style={{
                willChange: "opacity, transform",
                contain: "layout paint size",
              }}
            >
              <Image
                src={slides[index].src}
                className="object-cover"
                alt={
                  slides[index].alt ||
                  slides[index].heading ||
                  `Slide ${index + 1}`
                }
                fill
                priority={index === 0}
                sizes="100vw"
                placeholder={slides[index].blurDataURL ? "blur" : undefined}
                blurDataURL={slides[index].blurDataURL}
              />
              {slides[(index + 1) % count] && (
                <Image
                  src={slides[(index + 1) % count].src}
                  alt=""
                  fill
                  sizes="100vw"
                  priority={false}
                  style={{ visibility: "hidden", pointerEvents: "none" }}
                  aria-hidden
                />
              )}

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

              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.35)_100%)]" />
            </motion.div>
          </AnimatePresence>
        </div>

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

        <div className="absolute left-0 right-0 top-0 z-30 flex gap-2 px-4 py-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (i !== index) jumpTo(i);
              }}
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
