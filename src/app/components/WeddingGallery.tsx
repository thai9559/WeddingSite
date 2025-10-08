"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { WeddingData } from "@/app/types/wedding";
import {
  ForestSlider,
  type ForestSliderHandle,
} from "@/app/components/ForestSlider";

export default function WeddingGallery({ data }: { data: WeddingData }) {
  // Album đang chọn (mặc định: album đầu tiên)
  const [activeAlbumKey, setActiveAlbumKey] = useState<string | null>(
    data.albums?.[0]?.key ?? null
  );

  // Map album theo key để tra cứu nhanh
  const albumMap = useMemo(
    () => new Map(data.albums.map((a) => [a.key, a] as const)),
    [data.albums]
  );

  // Danh sách ảnh đang hiển thị (gallery theo album đang chọn)
  const activeList = useMemo(() => {
    if (activeAlbumKey && albumMap.has(activeAlbumKey)) {
      const album = albumMap.get(activeAlbumKey)!;
      return album.imageUrls.map((url, idx) => ({
        id: idx + 1,
        url,
        caption: `${album.title} – khoảnh khắc ${idx + 1}`,
      }));
    }
    return data.gallery;
  }, [activeAlbumKey, albumMap, data.gallery]);

  // Slider ref để điều khiển next/prev
  const sliderRef = useRef<ForestSliderHandle | null>(null);
  const prev = useCallback(() => sliderRef.current?.prev(), []);
  const next = useCallback(() => sliderRef.current?.next(), []);

  // Khi đổi album -> nhảy về ảnh đầu tiên
  useEffect(() => {
    sliderRef.current?.jumpTo(0);
  }, [activeAlbumKey]);

  // Phím mũi tên trái/phải
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  // Lấy tiêu đề album đang chọn để hiển thị
  const activeAlbumTitle =
    activeAlbumKey && albumMap.get(activeAlbumKey)?.title;

  // Slides cho ForestSlider
  const slides = useMemo(
    () =>
      activeList.map((item) => ({
        src: item.url,
        heading: activeAlbumTitle ?? "Bộ sưu tập",
        subheading: item.caption,
        alt: item.caption,
      })),
    [activeList, activeAlbumTitle]
  );

  const scrollToCards = useCallback(() => {
    const el = document.getElementById("album-cards");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <section className="mx-auto max-w-7xl py-12">
      <h2
        className="text-center text-5xl font-extrabold tracking-wide text-gray-700"
        style={{ fontFamily: '"Ms Madi", cursive' }}
      >
        Bộ Sưu Tập Cưới
      </h2>

      <p
        className="mt-1 text-center text-gray-500 text-2xl"
        style={{ fontFamily: '"Ms Madi", cursive' }}
      >
        Câu chuyện qua từng khung hình
      </p>

      {/* Lưới 2 cột: trái = gallery, phải = albums */}
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
        {/* CỘT TRÁI: ForestSlider */}
        <div className="rounded-md border border-lime-400 p-6">
          <div className="flex flex-col gap-4">
            <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-md bg-gray-100 h-[70vh] md:h-[70vh] lg:h-[70vh] min-h-[300px]">
              <div className="absolute inset-0">
                <ForestSlider
                  ref={sliderRef}
                  slides={slides}
                  autoplay
                  intervalMs={5000}
                  intensity={0.6}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={scrollToCards}
                className="inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 cursor-pointer"
              >
                Xem toàn bộ albums
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Albums */}
        <aside className="space-y-4 p-8 md:p-0" id="album-cards">
          <h3
            className="text-2xl font-medium text-gray-800"
            style={{ fontFamily: '"Ms Madi", cursive' }}
          >
            Albums
          </h3>
          <hr className="border-t border-gray-300 mt-1" />

          <div className="grid grid-cols-2 gap-3">
            {data.albums.map((a) => {
              const isActive = a.key === activeAlbumKey;
              return (
                <button
                  key={a.key}
                  onClick={() => setActiveAlbumKey(a.key)}
                  className={`group overflow-hidden rounded-md border bg-white transition hover:shadow-sm text-left ${
                    isActive ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <div className="relative w-full aspect-[4/3]">
                    <Image
                      src={a.coverUrl}
                      alt={a.title}
                      fill
                      sizes="200px"
                      className="object-cover object-top group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="border-t" />
                  <div className="p-2 text-center text-xs font-medium text-gray-700 group-hover:text-blue-600">
                    {a.title}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}
