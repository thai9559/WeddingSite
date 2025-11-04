// src/app/admin/rsvps/view.tsx  ⬅️ (giữ nguyên file Albums của bạn ở đường dẫn thực tế)
// Nếu file của bạn là: src/app/components/Cards.tsx hay tương tự, hãy đặt đúng path.

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import LightBox from "./Lightbox";

type Album = {
  id: number;
  key: string;
  title: string;
  cover_url?: string | null;
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
    let cancelled = false;

    (async () => {
      try {
        const supabase = supabaseBrowser(); // ✅ lấy client
        const { data, error } = await supabase
          .from("albums")
          .select("id, key, title, cover_url")
          .order("id", { ascending: true });

        if (error) throw error;
        if (!cancelled) setAlbums((data as Album[]) ?? []);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Không thể tải danh sách album.";
        if (!cancelled) setError(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Khi mở 1 album -> load ảnh album đó
  useEffect(() => {
    if (!openAlbum) {
      setImages([]);
      setViewerIndex(null);
      return;
    }

    let cancelled = false; // ✅ tránh set state sau unmount

    (async () => {
      try {
        setLoadingImages(true);
        const supabase = supabaseBrowser(); // ✅ lấy client
        const { data, error } = await supabase
          .from("images")
          .select("id, url, caption, sort")
          .eq("album_id", openAlbum.id)
          .order("sort", { ascending: true, nullsFirst: true })
          .order("id", { ascending: true });

        if (error) throw error;
        if (!cancelled) setImages((data as AlbumImage[]) ?? []);
      } catch {
        if (!cancelled) setImages([]);
      } finally {
        if (!cancelled) setLoadingImages(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
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
        {albums.map((a, index) => (
          <motion.article
            key={a.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              ease: "easeOut",
            }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="group cursor-pointer"
            onClick={() => setOpenAlbum(a)}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-lg group-hover:shadow-2xl transition-shadow duration-300">
              {a.cover_url ? (
                <Image
                  src={a.cover_url}
                  alt={a.title}
                  fill
                  className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-neutral-100 text-neutral-400 text-sm">
                  Không có cover
                </div>
              )}
              <motion.div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
                initial={{ opacity: 0.6 }}
                whileHover={{ opacity: 0.8 }}
                transition={{ duration: 0.3 }}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-center">
                <motion.div
                  className="text-[11px] tracking-[0.3em] text-white/90 font-medium"
                  initial={{ y: 10, opacity: 0.9 }}
                  whileHover={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {a.title.toUpperCase()}
                </motion.div>
                <motion.div
                  className="text-[10px] tracking-widest text-white/70 mt-0.5"
                  initial={{ y: 5, opacity: 0.7 }}
                  whileHover={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                >
                  {a.key}
                </motion.div>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    );
  }, [albums, error]);

  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-14">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center text-5xl font-extrabold tracking-wide text-gray-700"
        style={{ fontFamily: '"Ms Madi", cursive' }}
      >
        Albums
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {content}
      </motion.div>

      {/* Modal xem ảnh dạng grid */}
      <AnimatePresence>
        {openAlbum && viewerIndex === null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              if (e.target === e.currentTarget) setOpenAlbum(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
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
                      <motion.button
                        key={img.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.3,
                          delay: i * 0.05,
                          ease: "easeOut",
                        }}
                        whileHover={{ scale: 1.05, zIndex: 10 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative aspect-[3/4] overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
                        onClick={() => setViewerIndex(i)}
                        aria-label={`View ${openAlbum.title} ${i + 1}`}
                      >
                        <Image
                          src={img.url}
                          alt={img.caption ?? openAlbum.title}
                          fill
                          className="object-cover transition-transform duration-500 hover:scale-110"
                        />
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
