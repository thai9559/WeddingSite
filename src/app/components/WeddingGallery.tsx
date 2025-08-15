"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WeddingData } from "@/app/types/wedding";

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
  const activeAlbum = activeAlbumKey ? albumMap.get(activeAlbumKey) : undefined;

  // Danh sách ảnh đang hiển thị (gallery theo album đang chọn)
  const activeList = useMemo(() => {
    if (activeAlbumKey && albumMap.has(activeAlbumKey)) {
      const album = albumMap.get(activeAlbumKey)!;
      return album.imageUrls.map((url, idx) => ({
        id: idx + 1,
        url,
        // Tự sinh caption nếu không có từ API
        caption: `${album.title} – khoảnh khắc ${idx + 1}`,
      }));
    }
    // fallback: dùng gallery mặc định trong data (không cần nếu luôn chọn album)
    return data.gallery;
  }, [activeAlbumKey, albumMap, data.gallery]);

  // index ảnh hiện tại trong danh sách đang hiển thị
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [activeAlbumKey]); // đổi album -> về ảnh đầu

  const current = activeList[index];

  const prev = () =>
    setIndex((i) => (i - 1 + activeList.length) % activeList.length);
  const next = () => setIndex((i) => (i + 1) % activeList.length);

  // phím mũi tên
  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  // Lấy tiêu đề album đang chọn để hiển thị
  const activeAlbumTitle =
    activeAlbumKey && albumMap.get(activeAlbumKey)?.title;

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

      {/* Lưới 2 cột: trái = gallery, phải = albums + thumbnails */}
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
        {/* CỘT TRÁI: Ảnh lớn + caption + mô tả */}
        <div className="rounded-md border border-lime-400 p-6">
          <div className="flex flex-col gap-4">
            {/* Ảnh lớn */}
            <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-md bg-gray-100 h-[70vh] md:h-[70vh] lg:h-[90vh] min-h-[380px]">
              <Image
                key={current.url}
                src={current.url}
                alt={current.caption}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 900px, 1100px"
                className="object-cover object-top"
                priority
              />
            </div>

            {/* Caption */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/90 px-6 py-7 md:py-8 min-h-24 shadow">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-sm bg-green-500 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <p className="text-base text-gray-700">
                  {activeAlbumTitle ? `${activeAlbumTitle}: ` : "Câu chuyện "}
                  {current.caption}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={prev}
                  aria-label="Ảnh trước"
                  className="grid h-9 w-9 place-items-center rounded bg-green-500 text-white hover:bg-green-700 cursor-pointer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={next}
                  aria-label="Ảnh kế"
                  className="grid h-9 w-9 place-items-center rounded bg-green-500 text-white hover:bg-green-700 cursor-pointer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mô tả dưới ảnh */}
            <div className="rounded bg-gray-50 p-5 text-sm leading-relaxed text-gray-600">
              {activeAlbum?.description ??
                "Bộ ảnh cưới được kể lại như một cuốn nhật ký nhỏ. Chạm vào từng ảnh để xem câu chuyện tương ứng."}
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

        {/* CỘT PHẢI: Albums ở trên, thumbnails theo album ở dưới */}
        <aside className="space-y-4 p-8 md:p-0">
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

          <hr className="border-gray-200" />

          {/* Thumbnails của album đang chọn */}
          {/* Thumbnails của album đang chọn */}
          <ul className="hidden md:grid grid-cols-2 gap-5">
            {activeList.map((img, i) => (
              <li
                key={`${activeAlbumKey ?? "default"}-${i}`}
                className={`relative cursor-pointer overflow-hidden rounded border ${
                  i === index ? "ring-2 ring-green-500" : "hover:opacity-90"
                }`}
                onClick={() => setIndex(i)}
                aria-label={`Chọn ảnh ${i + 1}`}
              >
                <div
                  className={`absolute left-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-sm text-[10px] font-bold transition-colors duration-200 ${
                    i === index
                      ? "bg-green-500 text-white shadow"
                      : "bg-white/95 text-green-600"
                  }`}
                >
                  {i + 1}
                </div>
                <div className="relative aspect-square">
                  <Image
                    src={img.url}
                    alt={`Thumbnail ${i + 1}`}
                    fill
                    sizes="180px"
                    className="object-cover"
                  />
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
