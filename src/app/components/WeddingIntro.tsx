"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

type Props = {
  onComplete: () => void;
};

// Thông tin cô dâu chú rể - lấy từ Navbar hoặc config
// Nếu có trong Navbar thì dùng, nếu không thì dùng default
const BRIDE_NAME = "Hai Yen"; // Từ Navbar: "Nhut Quang & Hai Yen"
const GROOM_NAME = "Nhut Quang"; // Từ Navbar: "Nhut Quang & Hai Yen"
const WEDDING_DATE = "21/12/2025";

// Heart particles animation
const HeartParticle = ({ delay, index }: { delay: number; index: number }) => {
  // Sử dụng random seed để tránh lỗi SSR
  const seed = index * 137.5; // Golden angle
  const randomX = (Math.sin(seed) * 0.5 + 0.5) * 100; // 0-100%
  const randomY = Math.cos(seed) * 50; // Variation for y
  const randomDuration = 3 + (Math.sin(seed * 2) * 0.5 + 0.5) * 2; // 3-5s

  return (
    <motion.div
      className="absolute text-rose-400 opacity-60"
      initial={{
        y: 0,
        x: `${randomX}%`,
        opacity: 0,
        scale: 0,
      }}
      animate={{
        y: -100,
        x: `${randomX + randomY}%`,
        opacity: [0, 1, 0.8, 0],
        scale: [0, 1.2, 1, 0.8],
      }}
      transition={{
        duration: randomDuration,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    >
      <Heart className="w-4 h-4 fill-rose-400" />
    </motion.div>
  );
};

export default function WeddingIntro({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Đảm bảo component đã mount trên client
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Bắt đầu animation sequence - timing nhanh hơn và mượt mà
    const steps = [
      { duration: 1200, step: 1 }, // "We're getting married"
      { duration: 1500, step: 2 }, // Tên cô dâu
      { duration: 800, step: 3 }, // "&"
      { duration: 1500, step: 4 }, // Tên chú rể
      { duration: 2000, step: 6 }, // Hiển thị tên một lúc rồi fade out
    ];

    // Bắt đầu từ step 1
    setCurrentStep(1);

    let currentTimeout: NodeJS.Timeout;
    let currentIndex = 0;

    const runStep = () => {
      if (currentIndex < steps.length) {
        const { duration, step } = steps[currentIndex];
        currentTimeout = setTimeout(() => {
          setCurrentStep(step);
          currentIndex++;
          if (currentIndex < steps.length) {
            runStep();
          } else {
            // Set step 6 để trigger fade out animation
            setCurrentStep(6);
            // Đợi fade out animation hoàn thành (1.2s) rồi mới gọi onComplete
            setTimeout(() => {
              onComplete();
            }, 1200);
          }
        }, duration);
      }
    };

    // Bắt đầu sequence ngay sau khi step 1 đã được set
    const startTimer = setTimeout(() => {
      runStep();
    }, 50);

    return () => {
      if (currentTimeout) clearTimeout(currentTimeout);
      clearTimeout(startTimer);
    };
  }, [mounted, onComplete]);

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50">
        <div className="text-rose-600">Loading...</div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {currentStep < 6 && (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          animate={{
            opacity: currentStep === 6 ? 0 : 1,
            scale: currentStep === 6 ? 0.95 : 1,
          }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            duration: currentStep === 6 ? 1.2 : 0.3,
            ease: "easeInOut",
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50"
        >
          {/* Heart particles background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <HeartParticle key={i} delay={i * 0.3} index={i} />
            ))}
          </div>

          {/* Main content */}
          <div className="relative z-10 text-center px-6">
            {/* Step 1: "We're getting married" */}
            {currentStep >= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mb-8"
              >
                <p
                  className="text-sm md:text-base tracking-[0.3em] text-rose-600 font-light uppercase"
                  style={{ fontFamily: '"Ms Madi", cursive' }}
                >
                  We&apos;re getting married
                </p>
              </motion.div>
            )}

            {/* Step 2-4: Names */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-4 min-h-[120px] md:min-h-[160px]">
              {/* Bride name */}
              {currentStep >= 2 && (
                <motion.div
                  initial={{ opacity: 0, x: -50, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{
                    duration: 0.6,
                    type: "spring",
                    stiffness: 150,
                    damping: 15,
                  }}
                >
                  <h1
                    className="text-4xl md:text-6xl lg:text-7xl font-bold text-rose-700"
                    style={{ fontFamily: '"Ms Madi", cursive' }}
                  >
                    {BRIDE_NAME}
                  </h1>
                </motion.div>
              )}

              {/* "&" symbol */}
              {currentStep >= 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{
                    duration: 0.4,
                    type: "spring",
                    stiffness: 250,
                    damping: 12,
                  }}
                  className="text-3xl md:text-5xl text-rose-500"
                  style={{ fontFamily: '"Ms Madi", cursive' }}
                >
                  &amp;
                </motion.div>
              )}

              {/* Groom name */}
              {currentStep >= 4 && (
                <motion.div
                  initial={{ opacity: 0, x: 50, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{
                    duration: 0.6,
                    type: "spring",
                    stiffness: 150,
                    damping: 15,
                  }}
                >
                  <h1
                    className="text-4xl md:text-6xl lg:text-7xl font-bold text-rose-700"
                    style={{ fontFamily: '"Ms Madi", cursive' }}
                  >
                    {GROOM_NAME}
                  </h1>
                </motion.div>
              )}
            </div>

            {/* Decorative elements */}
            <div className="absolute -z-10 inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-64 h-64 md:w-96 md:h-96 bg-rose-200 rounded-full blur-3xl opacity-30"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.4, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
