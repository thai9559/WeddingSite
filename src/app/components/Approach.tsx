"use client";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";

export function Approach() {
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // tự phát khi đã chuyển qua video
  useEffect(() => {
    if (showVideo && videoRef.current) {
      videoRef.current.play().catch(() => {
        // nếu bị chặn autoplay, user có thể click vào video để chạy
      });
    }
  }, [showVideo]);

  // toggle pause/play khi click video
  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play();
    else el.pause();
  };

  return (
    <section className="relative mt-20 overflow-hidden select-none">
      <h2
        className="text-center text-5xl font-extrabold tracking-wide text-gray-700"
        style={{ fontFamily: '"Ms Madi", cursive' }}
      >
        Video
      </h2>
      <div className="relative h-[80vh] mt-4">
        {/* ảnh khi chưa phát */}
        {!showVideo && (
          <Image
            src="/images/main-banner.jpg"
            alt="Tablescape"
            fill
            className="object-cover"
            priority
          />
        )}

        {/* video khi phát; click để pause/play */}
        {showVideo && (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full cursor-pointer object-cover"
            src="/video/wedding.mp4"
            autoPlay
            playsInline
            poster="/images/main-banner.jpg"
            onClick={togglePlay}
            onEnded={() => setShowVideo(false)} // hết video quay về ảnh
          />
        )}
      </div>

      {/* overlay + text + nút: CHỈ hiện khi chưa phát */}
      {!showVideo && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-black/40 via-black/20 to-transparent">
          <div className="px-6 text-center text-white">
            <h3 className="mb-6 text-[11px] tracking-[0.6em]">OUR APPROACH</h3>
            <p className="mx-auto max-w-3xl text-sm/relaxed text-white/90">
              Chúng tôi tạo nên không gian ấm áp nuôi dưỡng sự kết nối và câu
              chuyện. Kinh nghiệm sâu rộng trong lập kế hoạch lẫn styling giúp
              từng chi tiết hòa quyện tự nhiên.
            </p>

            <div className="mt-7 inline-flex items-center gap-3">
              <button
                onClick={() => setShowVideo(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/60 px-5 py-2 text-xs tracking-widest text-white/90 hover:bg-white/10"
                aria-label="Play wedding video"
              >
                <span className="grid size-4 place-items-center rounded-full bg-white text-black">
                  ►
                </span>
                PLAY VIDEO
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
