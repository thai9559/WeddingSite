"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  images: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  title?: string;
};

const MIN = 1;
const HARD_MAX = 4; // trần trên cùng – còn lại sẽ giới hạn động theo fit & DPR
const STEP = 0.5;

export default function LightBox({
  images,
  index,
  onIndexChange,
  onClose,
  title,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // fit & maxScale động (để không upscale > độ phân giải ảnh)
  const fitRef = useRef(1);
  const [maxScale, setMaxScale] = useState<number>(HARD_MAX);

  // reset khi đổi ảnh
  useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, [index]);

  // ESC, ←/→
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndexChange((index + 1) % images.length);
      if (e.key === "ArrowLeft")
        onIndexChange((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length, onClose, onIndexChange]);

  // tính fit + maxScale theo container & ảnh thực
  const recalcFit = useCallback(() => {
    const c = wrapRef.current;
    const img = imgRef.current;
    if (!c || !img || !img.naturalWidth || !img.naturalHeight) return;

    const cw = c.clientWidth;
    const ch = c.clientHeight;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    const fit = Math.min(cw / nw, ch / nh); // scale để ảnh "contain" khung ở mức 100%
    fitRef.current = fit;

    // không upscale vượt độ phân giải thật (tính theo DPR)
    const dpr = window.devicePixelRatio || 1;
    const safeMax = Math.max(1, 1 / (fit * dpr)); // ví dụ fit=0.5, dpr=1 => max=2
    const nextMax = Math.min(HARD_MAX, safeMax);

    setMaxScale(nextMax);

    // Nếu đang vượt max mới, kéo xuống
    setScale((s) => Math.min(s, nextMax));
    // cập nhật pan theo giới hạn mới
    const p = clampPan(Math.min(scale, nextMax), tx, ty);
    setTx(p.x);
    setTy(p.y);
  }, [scale, tx, ty]);

  // Gắn ResizeObserver cho khung để luôn đúng khi viewport đổi
  useEffect(() => {
    const c = wrapRef.current;
    if (!c) return;
    const ro = new ResizeObserver(() => recalcFit());
    ro.observe(c);
    return () => ro.disconnect();
  }, [recalcFit]);

  // giữ ảnh trong khung khi pan
  const clampPan = useCallback((s: number, nx: number, ny: number) => {
    const c = wrapRef.current;
    const img = imgRef.current;
    if (!c || !img) return { x: nx, y: ny };

    const cw = c.clientWidth;
    const ch = c.clientHeight;

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    const fit = fitRef.current; // fit tại scale=1
    const dw = nw * fit * s;
    const dh = nh * fit * s;

    const bx = Math.max(0, (dw - cw) / 2);
    const by = Math.max(0, (dh - ch) / 2);

    return {
      x: Math.min(bx, Math.max(-bx, nx)),
      y: Math.min(by, Math.max(-by, ny)),
    };
  }, []);

  const setZoom = useCallback(
    (next: number, anchor?: { x: number; y: number }) => {
      const limit = Math.max(MIN, Math.min(maxScale, next));

      if (anchor && wrapRef.current) {
        const c = wrapRef.current;
        const rect = c.getBoundingClientRect();
        const ax = anchor.x - rect.left - c.clientWidth / 2;
        const ay = anchor.y - rect.top - c.clientHeight / 2;
        const k = limit / scale;

        const nx = ax - k * (ax - tx);
        const ny = ay - k * (ay - ty);

        const p = clampPan(limit, nx, ny);
        setScale(limit);
        setTx(p.x);
        setTy(p.y);
      } else {
        const p = clampPan(limit, tx, ty);
        setScale(limit);
        setTx(p.x);
        setTy(p.y);
      }
    },
    [scale, tx, ty, clampPan, maxScale]
  );

  const zoomAt = (clientX: number, clientY: number, dir: "in" | "out") =>
    setZoom(scale + (dir === "in" ? STEP : -STEP), { x: clientX, y: clientY });

  // Mouse drag pan
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0, sx: 0, sy: 0 });

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (scale === 1) return;
    dragging.current = true;
    start.current = { x: e.clientX, y: e.clientY, sx: tx, sy: ty };
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const nx = start.current.sx + (e.clientX - start.current.x);
    const ny = start.current.sy + (e.clientY - start.current.y);
    const p = clampPan(scale, nx, ny);
    setTx(p.x);
    setTy(p.y);
  };
  const endDrag = () => {
    dragging.current = false;
  };

  // Touch pan
  const tDrag = useRef<null | { x: number; y: number; sx: number; sy: number }>(
    null
  );
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (scale === 1) return;
    const t = e.touches[0];
    tDrag.current = { x: t.clientX, y: t.clientY, sx: tx, sy: ty };
  };
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!tDrag.current) return;
    const t = e.touches[0];
    const nx = tDrag.current.sx + (t.clientX - tDrag.current.x);
    const ny = tDrag.current.sy + (t.clientY - tDrag.current.y);
    const p = clampPan(scale, nx, ny);
    setTx(p.x);
    setTy(p.y);
  };
  const onTouchEnd = () => {
    tDrag.current = null;
  };

  // Click ảnh: zoom in theo điểm bấm; nếu đang max → về 100% giữa khung
  const onImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (scale >= maxScale - 1e-6) {
      setZoom(1);
      setTx(0);
      setTy(0);
    } else zoomAt(e.clientX, e.clientY, "in");
  };

  const transform = useMemo(
    () => `translate(${tx}px, ${ty}px) scale(${scale})`,
    [tx, ty, scale]
  );

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/95"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 text-white">
        <div className="text-xs tracking-[0.35em] opacity-80">
          {title ? `${title} · ` : ""}
          {index + 1}/{images.length}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-80">
            {Math.round(scale * 100)}% (max {Math.round(maxScale * 100)}%)
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              zoomAt(window.innerWidth / 2, window.innerHeight / 2, "out");
            }}
            className="rounded-full cursor-pointer border border-white/40 px-3 py-1 text-xs hover:bg-white/10"
          >
            −
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              zoomAt(window.innerWidth / 2, window.innerHeight / 2, "in");
            }}
            className="rounded-full cursor-pointer border border-white/40 px-3 py-1 text-xs hover:bg-white/10"
          >
            +
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(1);
              setTx(0);
              setTy(0);
            }}
            className="rounded-full cursor-pointer border border-white/40 px-3 py-1 text-xs hover:bg-white/10"
          >
            FIT
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded-full cursor-pointer border border-white/40 px-3 py-1 text-xs hover:bg-white/10"
          >
            ×
          </button>
        </div>
      </div>

      {/* khung ảnh */}
      <div className="flex h-full w-full items-center justify-center p-4">
        <div
          ref={wrapRef}
          className="max-h-[90vh] max-w-[95vw] overflow-hidden"
          style={{
            cursor:
              scale > 1 ? (dragging.current ? "grabbing" : "grab") : "zoom-in",
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <Image
            ref={imgRef}
            src={images[index]}
            alt={`image ${index + 1}`}
            width={1600}
            height={1200}
            unoptimized
            quality={100}
            className="max-h-[85vh] max-w-[90vw] select-none touch-none"
            style={{
              width: "auto",
              height: "auto",
              transform,
              transformOrigin: "center center",
              transition:
                dragging.current || tDrag.current
                  ? "none"
                  : "transform 120ms ease",
              imageRendering: "auto",
            }}
            draggable={false}
            onClick={onImageClick}
            sizes="(max-width: 1024px) 90vw, 90vw"
            priority
            onLoad={() => recalcFit()}
          />
        </div>
      </div>

      {/* arrows */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between">
        <button
          className="pointer-events-auto cursor-pointer m-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index - 1 + images.length) % images.length);
          }}
        >
          ‹
        </button>
        <button
          className="pointer-events-auto cursor-pointer m-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index + 1) % images.length);
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}
