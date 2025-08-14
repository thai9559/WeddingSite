"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import LightBox from "./Lightbox";

type AlbumItem = { label: string; cover: string; images: string[] };

const albums: AlbumItem[] = [
  {
    label: "Pre-wedding",
    cover: "/albums/wedding/10.jpg",
    images: [
      "/albums/prewedding/1.jpg",
      "/albums/prewedding/2.jpg",
      "/albums/prewedding/3.jpg",
      "/albums/prewedding/4.jpg",
    ],
  },
  {
    label: "Đám hỏi",
    cover: "/albums/wedding/15.jpg",
    images: [
      "/albums/damhoi/1.jpg",
      "/albums/damhoi/2.jpg",
      "/albums/damhoi/3.jpg",
      "/albums/damhoi/4.jpg",
    ],
  },
  {
    label: "Lễ cưới",
    cover: "/albums/wedding/12.jpg",
    images: [
      "/albums/wedding/1.jpg",
      "/albums/wedding/2.jpg",
      "/albums/wedding/3.jpg",
      "/albums/wedding/4.jpg",
      "/albums/wedding/5.jpg",
      "/albums/wedding/6.jpg",
      "/albums/wedding/7.jpg",
      "/albums/wedding/8.jpg",
      "/albums/wedding/9.jpg",
      "/albums/wedding/10.jpg",
      "/albums/wedding/11.jpg",
      "/albums/wedding/12.jpg",
      "/albums/wedding/13.jpg",
      "/albums/wedding/14.jpg",
      "/albums/wedding/15.jpg",
      "/albums/wedding/16.jpg",
      "/albums/wedding/17.jpg",
      "/albums/wedding/18.jpg",
      "/albums/wedding/19.jpg",
      "/albums/wedding/20.jpg",
      "/albums/wedding/21.jpg",
      "/albums/wedding/22.jpg",
      "/albums/wedding/23.jpg",
      "/albums/wedding/24.jpg",
      "/albums/wedding/25.jpg",
      "/albums/wedding/26.jpg",
      "/albums/wedding/27.jpg",
      "/albums/wedding/28.jpg",
      "/albums/wedding/29.jpg",
      "/albums/wedding/30.jpg",
      "/albums/wedding/31.jpg",
      "/albums/wedding/32.jpg",
    ],
  },

  {
    label: "Gia đình",
    cover: "/albums/wedding/20.jpg",
    images: [
      "/albums/giadinh/1.jpg",
      "/albums/giadinh/2.jpg",
      "/albums/giadinh/3.jpg",
    ],
  },
  {
    label: "Bạn bè",
    cover: "/albums/wedding/8.jpg",
    images: [
      "/albums/banbe/1.jpg",
      "/albums/banbe/2.jpg",
      "/albums/banbe/3.jpg",
    ],
  },
];

export function Cards() {
  const [open, setOpen] = useState<AlbumItem | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // khóa scroll nền khi có modal nào mở
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <section id="services" className="mx-auto max-w-6xl px-6 pb-16 pt-14">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((item) => (
          <article
            key={item.label}
            className="group cursor-pointer"
            onClick={() => {
              setOpen(item);
              setViewerIndex(null);
            }}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image
                src={item.cover}
                alt={item.label}
                fill
                className="object-cover object-top transition duration-500 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-center">
                <div className="text-[11px] tracking-[0.3em] text-white/90">
                  {item.label.toUpperCase()}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Modal grid ảnh đơn giản */}
      {open && viewerIndex === null && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(null);
          }}
        >
          <div className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-xs tracking-[0.35em] text-neutral-700">
                {open.label.toUpperCase()} — ALBUM
              </h3>
              <button
                onClick={() => setOpen(null)}
                className="rounded-full px-3 py-1 text-neutral-600 hover:bg-neutral-100"
              >
                ×
              </button>
            </div>
            <div className="max-h-[calc(90vh-52px)] overflow-auto p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {open.images.map((src, i) => (
                  <button
                    key={src + i}
                    className="relative aspect-[3/4] overflow-hidden rounded-lg"
                    onClick={() => setViewerIndex(i)}
                    aria-label={`View ${open.label} ${i + 1}`}
                  >
                    <Image
                      src={src}
                      alt={`${open.label} ${i + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LightBox */}
      {open && viewerIndex !== null && (
        <LightBox
          images={open.images}
          index={viewerIndex}
          title={open.label}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </section>
  );
}
