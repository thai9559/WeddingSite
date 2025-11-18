"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import { X } from "lucide-react";

type Props = {
  onComplete: () => void;
};

const BRIDE_NAME = "Hai Yen";
const GROOM_NAME = "Nhut Quang";
const WEDDING_DATE = "21/12/2025";

type LottieJson = Record<string, unknown>;

/* =========================================================
   AnimatedName: hiệu ứng từng ký tự xuất hiện như viết tay
   ========================================================= */
function AnimatedName({
  text,
  delay = 0,
  className = "",
}: {
  text: string;
  delay?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex ${className}`}
      aria-label={text}
      style={{ fontFamily: '"Ms Madi", cursive' }}
    >
      {text.split("").map((ch, idx) => (
        <motion.span
          key={`${text}-${idx}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            delay: delay + idx * 0.06,
            ease: "easeOut",
          }}
          className="inline-block"
        >
          {ch === " " ? "\u00A0" : ch}
        </motion.span>
      ))}
    </span>
  );
}

export default function WeddingIntro({ onComplete }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [animData, setAnimData] = useState<LottieJson | null>(null);

  // Đảm bảo chỉ chạy trên client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load Lottie JSON từ /public/lotties/wedding-intro.json
  useEffect(() => {
    let isCancelled = false;

    const loadJson = async () => {
      try {
        const res = await fetch("/lotties/wedding-intro.json");
        if (!res.ok) throw new Error("Failed to load lottie json");
        const json = (await res.json()) as LottieJson;
        if (!isCancelled) {
          setAnimData(json);
        }
      } catch (err) {
        console.error("Lottie load error:", err);
      }
    };

    loadJson();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    // Cho fade-out 400ms
    const timeoutId = window.setTimeout(() => {
      onComplete();
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onComplete]);

  // Auto close: ~4.2s
  useEffect(() => {
    if (!mounted || !visible) return;

    const timerId = window.setTimeout(() => {
      handleClose();
    }, 4200);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [mounted, visible, handleClose]);

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50">
        <div className="text-rose-600 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="wedding-intro-lottie"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50"
        >
          {/* Lottie full màn hình */}
          <div className="absolute inset-0">
            {animData ? (
              <Lottie
                animationData={animData}
                loop={false}
                autoplay
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50 animate-pulse" />
            )}

            {/* Overlay sáng nhẹ để chữ nổi hơn nhưng không bị tối */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-rose-100/60 via-white/25 to-white/0" />
          </div>

          {/* Nút skip */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 z-20 flex items-center gap-1 rounded-full border border-rose-200/70 bg-white/80 px-3 py-1 text-xs font-medium text-rose-500 shadow-sm backdrop-blur hover:bg-white"
          >
            <X className="h-3 w-3" />
            Bỏ qua
          </button>

          {/* Cụm nội dung: tagline + tên + ngày, đặt phía trên, giữa */}
          <div className="pointer-events-none absolute inset-x-0 top-12 z-20 px-6 text-center text-rose-700 md:top-16">
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mb-4 text-xs md:text-sm uppercase tracking-[0.35em] text-rose-500/90"
            >
              We&apos;re getting married
            </motion.p>

            <div className="mb-4 flex flex-col items-center justify-center gap-2 md:flex-row md:gap-5">
              <AnimatedName
                text={BRIDE_NAME}
                className="text-4xl md:text-6xl font-semibold text-rose-700 drop-shadow-sm"
              />
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.35, ease: "easeOut" }}
                className="text-3xl md:text-5xl text-rose-400 drop-shadow-sm"
                style={{ fontFamily: '"Ms Madi", cursive' }}
              >
                &
              </motion.span>
              <AnimatedName
                text={GROOM_NAME}
                delay={0.45}
                className="text-4xl md:text-6xl font-semibold text-rose-700 drop-shadow-sm"
              />
            </div>

            {/* Ngày cưới phóng to + font khác (serif) */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.9, ease: "easeOut" }}
              className="text-lg md:text-2xl tracking-[0.25em] text-rose-600"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              {WEDDING_DATE}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
