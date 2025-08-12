"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  images: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  title?: string;
};

const MIN = 1,
  MAX = 4,
  STEP = 0.5;

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

  // giữ ảnh trong khung khi pan
  const clampPan = useCallback((s: number, nx: number, ny: number) => {
    const c = wrapRef.current,
      img = imgRef.current;
    if (!c || !img) return { x: nx, y: ny };
    const cw = c.clientWidth,
      ch = c.clientHeight;
    const nw = img.naturalWidth,
      nh = img.naturalHeight;
    const fit = Math.min(cw / nw, ch / nh);
    const dw = nw * fit * s,
      dh = nh * fit * s;
    const bx = Math.max(0, (dw - cw) / 2),
      by = Math.max(0, (dh - ch) / 2);
    return {
      x: Math.min(bx, Math.max(-bx, nx)),
      y: Math.min(by, Math.max(-by, ny)),
    };
  }, []);

  const setZoom = useCallback(
    (next: number, anchor?: { x: number; y: number }) => {
      next = Math.max(MIN, Math.min(MAX, next));
      if (anchor && wrapRef.current) {
        const c = wrapRef.current;
        const rect = c.getBoundingClientRect();
        const ax = anchor.x - rect.left - c.clientWidth / 2;
        const ay = anchor.y - rect.top - c.clientHeight / 2;
        const k = next / scale;
        const nx = ax - k * (ax - tx);
        const ny = ay - k * (ay - ty);
        const p = clampPan(next, nx, ny);
        setScale(next);
        setTx(p.x);
        setTy(p.y);
      } else {
        const p = clampPan(next, tx, ty);
        setScale(next);
        setTx(p.x);
        setTy(p.y);
      }
    },
    [scale, tx, ty, clampPan]
  );

  const zoomAt = (clientX: number, clientY: number, dir: "in" | "out") =>
    setZoom(scale + (dir === "in" ? STEP : -STEP), { x: clientX, y: clientY });

  // Mouse drag pan
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const onMouseDown = (e: React.MouseEvent) => {
    if (scale === 1) return;
    dragging.current = true;
    start.current = { x: e.clientX, y: e.clientY, sx: tx, sy: ty };
  };
  const onMouseMove = (e: React.MouseEvent) => {
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

  // Touch pan (dùng number clientX/clientY để tránh lỗi React.Touch)
  const tDrag = useRef<null | { x: number; y: number; sx: number; sy: number }>(
    null
  );
  const onTouchStart = (e: React.TouchEvent) => {
    if (scale === 1) return;
    const t = e.touches[0]; // React.Touch OK: ta chỉ lấy clientX/Y
    tDrag.current = { x: t.clientX, y: t.clientY, sx: tx, sy: ty };
  };
  const onTouchMove = (e: React.TouchEvent) => {
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
  const onImageClick = (e: React.MouseEvent) => {
    if (scale >= MAX) {
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
      {/* top bar tối giản */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 text-white">
        <div className="text-xs tracking-[0.35em] opacity-80">
          {title ? `${title} · ` : ""}
          {index + 1}/{images.length}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-80">{Math.round(scale * 100)}%</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              zoomAt(window.innerWidth / 2, window.innerHeight / 2, "out");
            }}
            className="rounded-full border border-white/40 px-3 py-1 text-xs hover:bg-white/10"
          >
            −
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              zoomAt(window.innerWidth / 2, window.innerHeight / 2, "in");
            }}
            className="rounded-full border border-white/40 px-3 py-1 text-xs hover:bg-white/10"
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
            className="rounded-full border border-white/40 px-3 py-1 text-xs hover:bg-white/10"
          >
            FIT
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded-full border border-white/40 px-3 py-1 text-xs hover:bg-white/10"
          >
            ×
          </button>
        </div>
      </div>

      {/* ảnh */}
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
          <img
            ref={imgRef}
            src={images[index]}
            alt={`image ${index + 1}`}
            className="max-h-[85vh] max-w-[90vw] select-none touch-none"
            style={{
              transform,
              transformOrigin: "center center",
              transition:
                dragging.current || tDrag.current
                  ? "none"
                  : "transform 120ms ease",
            }}
            draggable={false}
            onClick={onImageClick}
          />
        </div>
      </div>

      {/* arrows */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between">
        <button
          className="pointer-events-auto m-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index - 1 + images.length) % images.length);
          }}
        >
          ‹
        </button>
        <button
          className="pointer-events-auto m-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
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
