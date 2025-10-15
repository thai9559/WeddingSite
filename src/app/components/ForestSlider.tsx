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
  /** 0..1: ảnh hưởng biên độ scale khi chuyển */
  intensity?: number;
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
    const pendingRef = useRef<number | null>(null);

    // pause khi tab ẩn
    const [running, setRunning] = useState(true);
    useEffect(() => {
      const onVis = () => setRunning(!document.hidden);
      document.addEventListener("visibilitychange", onVis);
      return () => document.removeEventListener("visibilitychange", onVis);
    }, []);

    // điều hướng
    const go = useCallback(
      (delta: 1 | -1) => {
        if (isAnimating || count < 2) return;
        setIsAnimating(true);
        setDir(delta);
        setIndex((i) => (i + delta + count) % count);
      },
      [count, isAnimating]
    );
    const next = useCallback(() => go(1), [go]);
    const prev = useCallback(() => go(-1), [go]);

    const jumpTo = useCallback(
      (i: number) => {
        if (i < 0 || i >= count || i === index) return;
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

    useImperativeHandle(
      ref,
      () => ({ jumpTo, next, prev, getIndex: () => index }),
      [jumpTo, next, prev, index]
    );

    // onChange + restart progress
    const [progressKey, setProgressKey] = useState(0);
    useEffect(() => {
      onChange?.(index);
      setProgressKey((k) => k + 1);
    }, [index, onChange, intervalMs]);

    // Autoplay: setTimeout tránh drift
    useEffect(() => {
      if (!autoplay || !running || isAnimating || count < 2) return;
      const id = window.setTimeout(() => next(), intervalMs);
      return () => clearTimeout(id);
    }, [autoplay, running, isAnimating, count, next, intervalMs, index]);

    // Swipe bằng Pointer Events
    const startX = useRef<number | null>(null);
    const SWIPE = 60;
    const onPointerDown = (e: React.PointerEvent) => {
      startX.current = e.clientX;
    };
    const onPointerMove = (e: React.PointerEvent) => {
      const s = startX.current;
      if (s == null) return;
      const dx = e.clientX - s;
      if (Math.abs(dx) > SWIPE) {
        dx < 0 ? next() : prev();
        startX.current = null;
      }
    };
    const onPointerUp = () => {
      startX.current = null;
    };

    // Hiệu ứng NHƯ CŨ: zoom theo hướng (dir)
    const easeCubic = useMemo(
      () => [0.16, 1, 0.3, 1] as [number, number, number, number],
      []
    );
    const transitionIn: Transition = useMemo(
      () => ({ duration: 0.6, ease: easeCubic }),
      [easeCubic]
    );
    const transitionOut: Transition = useMemo(
      () => ({ duration: 0.5, ease: easeCubic }),
      [easeCubic]
    );

    const MAX_SCALE = 1 + 0.12 * intensity;
    const MIN_SCALE = 1 - 0.04 * intensity;

    const variants: Variants = useMemo(
      () => ({
        enter: (direction: 1 | -1) => ({
          opacity: 0,
          scale: direction === 1 ? MAX_SCALE : MIN_SCALE,
        }),
        center: {
          opacity: 1,
          scale: 1,
          transition: transitionIn,
        },
        exit: (direction: 1 | -1) => ({
          opacity: 0,
          scale: direction === 1 ? 1.02 * MAX_SCALE : 1.0,
          transition: transitionOut,
        }),
      }),
      [MAX_SCALE, MIN_SCALE, transitionIn, transitionOut]
    );

    const slide = slides[index];

    return (
      <section
        className="relative h-full w-full overflow-hidden bg-black"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="absolute inset-0">
          <AnimatePresence
            initial={false}
            onExitComplete={() => {
              setIsAnimating(false);
              if (pendingRef.current != null) {
                const i = pendingRef.current;
                pendingRef.current = null;
                setIsAnimating(true);
                setIndex(i);
              }
            }}
            custom={dir}
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
                transform: "translateZ(0)",
                backfaceVisibility: "hidden",
              }}
            >
              <Image
                src={slide.src}
                className="object-cover"
                alt={slide.alt || slide.heading || `Slide ${index + 1}`}
                fill
                priority={index === 0}
                sizes="100vw"
                placeholder={slide.blurDataURL ? "blur" : undefined}
                blurDataURL={slide.blurDataURL || undefined}
              />

              {/* Preload ảnh kế: opacity 0 để vẫn decode */}
              {slides[(index + 1) % count] ? (
                <Image
                  src={slides[(index + 1) % count].src}
                  alt=""
                  fill
                  sizes="100vw"
                  priority={false}
                  style={{ opacity: 0, pointerEvents: "none" }}
                  aria-hidden
                />
              ) : null}

              {(slide.heading || slide.subheading) && (
                <div className="absolute inset-x-0 top-[18%] z-20 mx-auto max-w-6xl px-6 text-white drop-shadow-[0_6px_14px_rgba(0,0,0,0.4)]">
                  {slide.heading && (
                    <motion.h2
                      className="text-5xl font-bold leading-tight md:text-7xl"
                      initial={{ y: 36, opacity: 0 }}
                      animate={{
                        y: 0,
                        opacity: 1,
                        transition: { duration: 0.6, ease: easeCubic },
                      }}
                      exit={{
                        y: -32,
                        opacity: 0,
                        transition: { duration: 0.45, ease: easeCubic },
                      }}
                    >
                      {slide.heading}
                    </motion.h2>
                  )}
                  {slide.subheading && (
                    <motion.p
                      className="mt-3 max-w-xl text-base text-white/85 md:text-lg"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{
                        y: 0,
                        opacity: 1,
                        transition: {
                          duration: 0.5,
                          ease: easeCubic,
                          delay: 0.04,
                        },
                      }}
                      exit={{
                        y: -20,
                        opacity: 0,
                        transition: { duration: 0.4, ease: easeCubic },
                      }}
                    >
                      {slide.subheading}
                    </motion.p>
                  )}
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.35)_100%)]" />
            </motion.div>
          </AnimatePresence>
        </div>

        {count > 1 && (
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
        )}

        {count > 1 && (
          <div className="absolute left-0 right-0 top-0 z-30 flex gap-2 px-4 py-3">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => i !== index && jumpTo(i)}
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
                          animationPlayState: running ? "running" : "paused",
                        }
                      : { width: i < index ? "100%" : "0%" }
                  }
                />
              </button>
            ))}
          </div>
        )}

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
