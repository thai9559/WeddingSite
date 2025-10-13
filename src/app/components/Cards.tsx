"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
// Nếu bạn đã có LightBox, import vào; nếu chưa, phần modal grid vẫn hoạt động
import LightBox from "./Lightbox";

type Album = {
  id: number;
  key: string;
  title: string;
  cover_url?: string | null; // nếu bạn có cột này
};

type AlbumImage = {
  id: number;
  url: string;
  caption?: string | null;
  sort?: number | null;
};

export default function Albums() {
  const [albums, setAlbums] = useState<Album[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // modal state
  const [openAlbum, setOpenAlbum] = useState<Album | null>(null);
  const [images, setImages] = useState<AlbumImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // khoá scroll khi mở modal
  useEffect(() => {
    document.body.style.overflow = openAlbum ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [openAlbum]);

  // tải danh sách album
  useEffect(() => {
    (async () => {
      try {
        // nếu bạn KHÔNG có cột cover_url, xoá nó khỏi select
        const { data, error } = await supabaseBrowser
          .from("albums")
          .select("id, key, title, cover_url")
          .order("id", { ascending: true });

        if (error) throw error;
        setAlbums((data as Album[]) ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Không thể tải danh sách album.");
      }
    })();
  }, []);

  // khi mở 1 album -> load ảnh album đó
  useEffect(() => {
    if (!openAlbum) {
      setImages([]);
      setViewerIndex(null);
      return;
    }
    (async () => {
      try {
        setLoadingImages(true);
        const { data, error } = await supabaseBrowser
          .from("images")
          .select("id, url, caption, sort")
          .eq("album_id", openAlbum.id)
          .order("sort", { ascending: true, nullsFirst: true })
          .order("id", { ascending: true });

        if (error) throw error;
        setImages((data as AlbumImage[]) ?? []);
      } catch (e: any) {
        setImages([]);
      } finally {
        setLoadingImages(false);
      }
    })();
  }, [openAlbum]);

  const content = useMemo(() => {
    if (error)
      return (
        <div className="text-center text-sm text-red-600">Lỗi: {error}</div>
      );
    if (!albums)
      return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="relative aspect-[4/3] rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      );
    if (albums.length === 0)
      return (
        <div className="text-center text-sm text-neutral-500">
          Chưa có album nào.
        </div>
      );

    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-4">
        {albums.map((a) => (
          <article
            key={a.id}
            className="group cursor-pointer"
            onClick={() => setOpenAlbum(a)}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              {/* Hiển thị cover_url nếu có; nếu không, vẫn tạo block trống để đều layout */}
              {a.cover_url ? (
                <Image
                  src={a.cover_url}
                  alt={a.title}
                  fill
                  className="object-cover object-top transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-neutral-100 text-neutral-400 text-sm">
                  Không có cover
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-center">
                <div className="text-[11px] tracking-[0.3em] text-white/90">
                  {a.title.toUpperCase()}
                </div>
                <div className="text-[10px] tracking-widest text-white/70 mt-0.5">
                  {a.key}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }, [albums, error]);

  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-14">
      <h2
        className="text-center text-5xl font-extrabold tracking-wide text-gray-700"
        style={{ fontFamily: '"Ms Madi", cursive' }}
      >
        Albums
      </h2>

      {content}

      {/* Modal xem ảnh dạng grid */}
      {openAlbum && viewerIndex === null && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenAlbum(null);
          }}
        >
          <div className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-xs tracking-[0.35em] text-neutral-700">
                {openAlbum.title.toUpperCase()} — ALBUM
              </h3>
              <button
                onClick={() => setOpenAlbum(null)}
                className="rounded-full px-3 py-1 text-neutral-600 hover:bg-neutral-100"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(90vh-52px)] overflow-auto p-4">
              {loadingImages ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[3/4] rounded-lg bg-neutral-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : images.length === 0 ? (
                <div className="text-sm text-neutral-500">
                  Album chưa có ảnh.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      className="relative aspect-[3/4] overflow-hidden rounded-lg"
                      onClick={() => setViewerIndex(i)}
                      aria-label={`View ${openAlbum.title} ${i + 1}`}
                    >
                      <Image
                        src={img.url}
                        alt={img.caption ?? openAlbum.title}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LightBox nếu bạn muốn xem full-screen */}
      {openAlbum && viewerIndex !== null && images.length > 0 && (
        <LightBox
          images={images.map((x) => x.url)}
          index={viewerIndex}
          title={openAlbum.title}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </section>
  );
}
