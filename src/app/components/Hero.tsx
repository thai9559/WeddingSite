// components/Hero.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { ForestSlider, ForestSliderHandle, ForestSlide } from "./ForestSlider";

type Device = "pc" | "mobile";

const BUCKET = "wedding";
const IS_PRIVATE_BUCKET = false; // true nếu bucket Private
const PREFIX = (dv: Device) => `banners/hero/${dv}`;

const MAX_SLIDES = 12;
const IMG_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

// --- helpers ---
function sb() {
  return supabaseBrowser; // instance
}
function getPublicUrl(path: string): string {
  const { data } = supabaseBrowser().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function getUrl(path: string): Promise<string> {
  if (!IS_PRIVATE_BUCKET) return getPublicUrl(path);

  const { data, error } = await supabaseBrowser()
    .storage.from(BUCKET)
    .createSignedUrl(path, 600); // 10 phút

  if (error || !data?.signedUrl) {
    throw error ?? new Error("Không tạo signed URL");
  }

  return data.signedUrl;
}

async function listFiles(prefix: string): Promise<string[]> {
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, ""); // tránh lỗi "///"

  const { data, error } = await supabaseBrowser()
    .storage.from(BUCKET)
    .list(cleanPrefix, {
      limit: 500,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) throw error;

  return (
    (data ?? [])
      // chỉ file (folder có id = null)
      .filter(
        (f) => typeof f?.name === "string" && (f as { id?: string | null }).id
      )
      .map((f) => `${cleanPrefix}/${f.name}`)
      .filter((p) => IMG_EXT.test(p))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .slice(0, MAX_SLIDES)
  );
}

// --- component ---
export function Hero() {
  const [device, setDevice] = useState<Device>("mobile"); // sẽ auto sync theo breakpoint
  const [slides, setSlides] = useState<ForestSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [index, setIndex] = useState(0);
  const sliderRef = useRef<ForestSliderHandle>(null);

  // Cache theo device
  const cacheRef = useRef<Record<Device, ForestSlide[]>>({
    pc: [],
    mobile: [],
  });

  // 🔸 Auto-chọn theo breakpoint md (768px)
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const apply = () => setDevice(mql.matches ? "pc" : "mobile");
    apply(); // set ngay khi mount
    mql.addEventListener?.("change", apply);
    return () => mql.removeEventListener?.("change", apply);
  }, []);

  const loadSlides = useCallback(async (dv: Device) => {
    setLoading(true);
    setErr("");

    let alive = true;
    const guard = () => alive;

    try {
      // dùng cache nếu có
      if (cacheRef.current[dv]?.length) {
        if (!guard()) return;
        setSlides(cacheRef.current[dv]);
        setIndex(0);
        sliderRef.current?.jumpTo(0);
        return;
      }

      const paths = await listFiles(PREFIX(dv));
      if (!guard()) return;

      if (!paths.length) {
        setSlides([]);
        throw new Error("Không tìm thấy file ảnh hợp lệ trong thư mục.");
      }

      const results = await Promise.allSettled(paths.map((p) => getUrl(p)));
      if (!guard()) return;

      const urls = results
        .filter(
          (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled"
        )
        .map((r) => r.value);

      if (!urls.length) {
        setSlides([]);
        throw new Error("Không thể tạo URL ảnh (có thể private/policy).");
      }

      const mapped: ForestSlide[] = urls.map((src, i) => ({
        src,
        heading: i === 0 ? "Our Wedding Day" : "Happily Ever After",
        subheading: i === 0 ? "A celebration of love" : "The journey continues",
      }));

      cacheRef.current[dv] = mapped;
      setSlides(mapped);
      setIndex(0);
      sliderRef.current?.jumpTo(0);
    } catch (e: unknown) {
      if (!guard()) return;
      setErr(e instanceof Error ? e.message : "Không tải được ảnh banner.");
    } finally {
      if (guard()) setLoading(false);
    }

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    loadSlides(device);
  }, [device, loadSlides]);

  const hasSlides = useMemo(() => slides.length > 0, [slides]);

  return (
    <section className="relative h-[100svh] w-full overflow-hidden bg-black">
      {hasSlides ? (
        <ForestSlider
          ref={sliderRef}
          slides={slides}
          intervalMs={5000}
          intensity={0.6}
          autoplay={true}
          onChange={setIndex}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-white/70">
          {loading ? "Đang tải ảnh…" : err || "Chưa có ảnh banner"}
        </div>
      )}

      {/* Dots */}
      {hasSlides && (
        <div className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => sliderRef.current?.jumpTo(i)}
              className={`h-1.5 w-6 rounded-full transition ${
                i === index ? "bg-white" : "bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
