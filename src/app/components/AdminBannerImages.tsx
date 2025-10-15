// app/components/AdminBannerImages.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabaseBrowser } from "@/app/lib/supabase-browser";

/* -------------------- types -------------------- */
type Device = "pc" | "mobile";

export type BannerImage = {
  id: number;
  path: string; // storage path (vd: banners/hero/pc/xxx.jpg)
  url: string; // src hiện tại (public/signed)
  device: Device;
  location: string;
};

type Props = {
  images: BannerImage[];
  onDelete: (img: BannerImage) => Promise<void> | void;
  deletingId: number | null;
};

const BUCKET = "wedding";

/* -------------------- helpers -------------------- */
// cache signed URL để không gọi lại nhiều lần
const signedCache = new Map<string, string>();

async function createSignedUrl(
  path: string,
  expires = 60 * 10
): Promise<string> {
  if (signedCache.has(path)) return signedCache.get(path)!;
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expires);
  if (error || !data?.signedUrl)
    throw error ?? new Error("Không tạo được signed URL");
  signedCache.set(path, data.signedUrl);
  return data.signedUrl;
}

/** Nhận biết mobile/touch (pointer: coarse hoặc < md) */
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse), (max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

/** Hook in-view đơn giản để lazy mount ảnh */
function useInView(options?: IntersectionObserverInit) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "300px 0px", threshold: 0, ...(options || {}) }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [options]);

  return { ref, inView };
}

/* -------------------- Item (memo) -------------------- */
type CardProps = {
  img: BannerImage;
  currentSrc: string;
  isDeleting: boolean;
  isMobile: boolean;
  activeId: number | null;
  setActiveId: (id: number | null) => void;
  requestSigned: (img: BannerImage) => void;
  openPreview: (img: BannerImage) => void;
  askDelete: (img: BannerImage) => void;
};

const BannerCard = React.memo(function BannerCard({
  img,
  currentSrc,
  isDeleting,
  isMobile,
  activeId,
  setActiveId,
  requestSigned,
  openPreview,
  askDelete,
}: CardProps) {
  const isActiveMobile = isMobile && activeId === img.id;
  const { ref, inView } = useInView();
  const [loaded, setLoaded] = React.useState(false);

  return (
    <li
      key={`${img.id}-${img.path}`}
      className="group relative overflow-hidden rounded border border-neutral-200 bg-white"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "300px 225px", // 4/3
      }}
    >
      <div ref={ref} className="relative aspect-[4/3] w-full">
        {/* chỉ mount <img> khi vào viewport */}
        {inView ? (
          <img
            src={currentSrc}
            alt={`banner ${img.id}`}
            width={1200}
            height={900}
            loading="lazy"
            decoding="async"
            draggable={false}
            className={[
              "h-full w-full object-cover select-none cursor-zoom-in",
              loaded ? "opacity-100" : "opacity-0",
              "transition-opacity duration-300",
            ].join(" ")}
            onLoad={() => setLoaded(true)}
            onError={() => requestSigned(img)}
            onClick={() => {
              if (isMobile) setActiveId(isActiveMobile ? null : img.id);
              else openPreview(img);
            }}
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-neutral-200/70" />
        )}

        {/* Overlay trung tâm */}
        <div
          className={[
            "absolute inset-0 flex items-center justify-center transition",
            "md:bg-black/0 md:opacity-0 md:group-hover:bg-black/20 md:group-hover:opacity-100",
            "md:pointer-events-none md:group-hover:pointer-events-auto",
            isActiveMobile
              ? "pointer-events-auto bg-black/30 opacity-100"
              : "pointer-events-none bg-black/0 opacity-0",
          ].join(" ")}
          onClick={() => {
            if (isActiveMobile) setActiveId(null);
          }}
        >
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setActiveId(null);
                openPreview(img);
              }}
            >
              Xem ảnh
            </Button>

            {/* Nút xoá (hiện ở mobile trong overlay) */}
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              title="Xoá ảnh khỏi Storage"
              onClick={() => {
                setActiveId(null);
                askDelete(img);
              }}
              className="md:hidden"
            >
              {isDeleting ? "Đang xoá…" : "Xoá"}
            </Button>
          </div>
        </div>

        {/* Nút xoá góc phải chỉ PC */}
        <Button
          variant="destructive"
          size="sm"
          disabled={isDeleting}
          className="absolute right-2 top-2 hidden opacity-0 transition md:block md:group-hover:opacity-100"
          title="Xoá ảnh khỏi Storage"
          onClick={() => askDelete(img)}
        >
          {isDeleting ? "Đang xoá…" : "Xoá"}
        </Button>
      </div>
    </li>
  );
});

/* -------------------- component -------------------- */
export function AdminBannerImages({ images, onDelete, deletingId }: Props) {
  const [preview, setPreview] = React.useState<BannerImage | null>(null);

  // id -> src (public hoặc signed nếu đã fallback)
  const [srcMap, setSrcMap] = React.useState<Record<number, string>>({});
  // đánh dấu đã thử signed cho ảnh nào để tránh loop vô hạn
  const [triedSigned, setTriedSigned] = React.useState<Record<number, boolean>>(
    {}
  );
  const [activeId, setActiveId] = React.useState<number | null>(null);
  const isMobile = useIsMobile();

  // Modal xoá dùng chung (giảm render nhiều AlertDialog)
  const [pendingDelete, setPendingDelete] = React.useState<BannerImage | null>(
    null
  );
  const openAskDelete = (img: BannerImage) => setPendingDelete(img);
  const closeAskDelete = () => setPendingDelete(null);
  const confirmDelete = async () => {
    if (pendingDelete) {
      await onDelete(pendingDelete);
      setPendingDelete(null);
    }
  };

  // reset mỗi khi danh sách ảnh đổi
  React.useEffect(() => {
    const init: Record<number, string> = {};
    for (const img of images) init[img.id] = img.url;
    setSrcMap(init);
    setTriedSigned({});
    setActiveId(null);
  }, [images]);

  // fallback: khi ảnh public 403/404 -> xin signed URL rồi cập nhật src
  const requestSigned = React.useCallback(
    async (img: BannerImage) => {
      if (!img?.path || triedSigned[img.id]) return;
      try {
        const signed = await createSignedUrl(img.path);
        setSrcMap((m) => ({ ...m, [img.id]: signed }));
        setTriedSigned((m) => ({ ...m, [img.id]: true }));
      } catch {
        // im lặng: file có thể đã xoá
      }
    },
    [triedSigned]
  );

  if (!images.length) {
    return (
      <p className="mt-3 text-sm text-neutral-500">
        Chưa có ảnh cho vị trí/thiết bị này.
      </p>
    );
  }

  return (
    <>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {images.map((img) => (
          <BannerCard
            key={img.id}
            img={img}
            currentSrc={srcMap[img.id] ?? img.url}
            isDeleting={deletingId === img.id}
            isMobile={isMobile}
            activeId={activeId}
            setActiveId={setActiveId}
            requestSigned={requestSigned}
            openPreview={(i) => setPreview(i)}
            askDelete={openAskDelete}
          />
        ))}
      </ul>

      {/* Preview dialog – dùng srcMap để đảm bảo đã fallback signed nếu cần */}
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent className="max-w-[90vw] bg-white p-0 sm:max-w-3xl">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Xem ảnh banner</DialogTitle>
            <DialogDescription>{preview?.path || ""}</DialogDescription>
          </DialogHeader>
          <div className="p-4">
            {preview && (
              <Image
                src={srcMap[preview.id] ?? preview.url}
                alt={`banner ${preview.id}`}
                width={1600}
                height={1200}
                sizes="90vw"
                className="h-auto max-h-[75vh] w-full rounded object-contain"
                onError={() => requestSigned(preview)}
                unoptimized
                priority
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ONE AlertDialog for all delete actions */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && closeAskDelete()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xoá ảnh?</AlertDialogTitle>
            <AlertDialogDescription>
              Ảnh sẽ bị xoá khỏi Storage. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
