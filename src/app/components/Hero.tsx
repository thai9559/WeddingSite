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

/* -------------------- helpers -------------------- */

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
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, ""); // tránh "///"

  const { data, error } = await supabaseBrowser()
    .storage.from(BUCKET)
    .list(cleanPrefix, {
      limit: 500,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) throw error;

  return (
    (data ?? [])
      // chỉ file (folder có name nhưng không có trailing slash)
      .filter((f) => typeof f?.name === "string")
      .map((f) => `${cleanPrefix}/${f.name}`)
      .filter((p) => IMG_EXT.test(p))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .slice(0, MAX_SLIDES)
  );
}

/* -------------------- component -------------------- */

export function Hero() {
  // Chỉ dùng setter để kích hoạt reload theo breakpoint -> tránh biến không dùng
  const [, setDevice] = useState<Device>("mobile");
  const [ready, setReady] = useState(false);
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

  // Hủy các request cũ nếu có "đua"
  const reqIdRef = useRef(0);

  const loadSlides = useCallback(async (dv: Device) => {
    const myId = ++reqIdRef.current;

    setLoading(true);
    setErr("");

    try {
      // dùng cache nếu có
      if (cacheRef.current[dv]?.length) {
        if (reqIdRef.current !== myId) return;
        setSlides(cacheRef.current[dv]);
        setIndex(0);
        sliderRef.current?.jumpTo(0);
        return;
      }

      const paths = await listFiles(PREFIX(dv));
      if (reqIdRef.current !== myId) return;

      if (!paths.length) {
        setSlides([]);
        throw new Error("Không tìm thấy file ảnh hợp lệ trong thư mục.");
      }

      const results = await Promise.allSettled(paths.map((p) => getUrl(p)));
      if (reqIdRef.current !== myId) return;

      const urls = results
        .filter(
          (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled"
        )
        .map((r) => r.value);

      if (!urls.length) {
        setSlides([]);
        throw new Error("Không thể tạo URL ảnh (có thể private/policy).");
      }

      const mapped: ForestSlide[] = urls.map((src) => ({ src }));

      cacheRef.current[dv] = mapped;
      if (reqIdRef.current !== myId) return;

      setSlides(mapped);
      setIndex(0);
      sliderRef.current?.jumpTo(0);
    } catch (e: unknown) {
      if (reqIdRef.current !== myId) return;
      setErr(e instanceof Error ? e.message : "Không tải được ảnh banner.");
    } finally {
      if (reqIdRef.current === myId) setLoading(false);
    }
  }, []);

  // Breakpoint: <768 = mobile, ≥768 = pc (như cũ)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(min-width: 768px)"); // ≥768 => pc
    const pick = (): Device => (mql.matches ? "pc" : "mobile");

    const init = pick();
    setDevice(init);
    setReady(true);
    loadSlides(init);

    // type cho Safari cũ
    type LegacyMQL = MediaQueryList & {
      addListener?: (listener: (ev: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (ev: MediaQueryListEvent) => void) => void;
    };

    const onChange = (_ev?: MediaQueryListEvent) => {
      const dv = pick();
      setDevice(dv);
      loadSlides(dv);
    };

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
    } else if (typeof (mql as LegacyMQL).addListener === "function") {
      (mql as LegacyMQL).addListener!(onChange);
    }

    return () => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", onChange);
      } else if (typeof (mql as LegacyMQL).removeListener === "function") {
        (mql as LegacyMQL).removeListener!(onChange);
      }
      reqIdRef.current++;
    };
  }, [loadSlides]);

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
          {!ready || loading ? "Đang tải ảnh…" : err || "Chưa có ảnh banner"}
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
