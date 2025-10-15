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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabaseBrowser } from "@/app/lib/supabase-browser";

/* -------------------- types -------------------- */
type Device = "pc" | "mobile";

export type BannerImage = {
  id: number;
  path: string; // path trong bucket (ví dụ: banners/hero/pc/xxx.jpg)
  url: string; // URL build từ path (public trước)
  device: Device;
  location: string;
};

type Props = {
  images: BannerImage[];
  onDelete: (img: BannerImage) => void;
  deletingId: number | null;
};

const BUCKET = "wedding";

/* -------------------- helpers -------------------- */
// tạo signed URL khi public URL fail
async function createSignedUrl(
  path: string,
  expires = 60 * 10
): Promise<string> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expires);
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Không tạo được signed URL");
  }
  return data.signedUrl;
}

/* -------------------- component -------------------- */
export function AdminBannerImages({ images, onDelete, deletingId }: Props) {
  const [preview, setPreview] = React.useState<BannerImage | null>(null);

  // id -> src (public hoặc signed nếu đã fallback)
  const [srcMap, setSrcMap] = React.useState<Record<number, string>>({});
  // đánh dấu đã thử signed cho ảnh nào để tránh loop vô hạn
  const [triedSigned, setTriedSigned] = React.useState<Record<number, boolean>>(
    {}
  );

  // reset mỗi khi danh sách ảnh đổi
  React.useEffect(() => {
    const init: Record<number, string> = {};
    for (const img of images) init[img.id] = img.url;
    setSrcMap(init);
    setTriedSigned({});
  }, [images]);

  // fallback: khi ảnh public 403/404 -> xin signed URL rồi cập nhật src
  async function handleImgError(img: BannerImage) {
    if (!img?.path || triedSigned[img.id]) return;
    try {
      const signed = await createSignedUrl(img.path);
      setSrcMap((m) => ({ ...m, [img.id]: signed }));
      setTriedSigned((m) => ({ ...m, [img.id]: true }));
    } catch {
      // có thể set placeholder nếu muốn
    }
  }

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
        {images.map((img) => {
          const currentSrc = srcMap[img.id] ?? img.url;
          return (
            <li
              key={`${img.id}-${img.path}`}
              className="group relative overflow-hidden rounded border bg-white"
            >
              <Image
                src={currentSrc}
                alt={`banner ${img.id}`}
                width={800}
                height={600}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="aspect-[4/3] w-full cursor-zoom-in object-cover"
                onClick={() => setPreview(img)}
                onError={() => handleImgError(img)}
                // Admin: tắt tối ưu để khỏi cần cấu hình domains ngay
                unoptimized
                priority={false}
              />

              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPreview(img)}
                >
                  Xem ảnh
                </Button>
              </div>

              {/* Nút xoá */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === img.id}
                    className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100"
                    title="Xoá ảnh khỏi Storage"
                  >
                    {deletingId === img.id ? "Đang xoá…" : "Xoá"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận xoá ảnh?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ảnh sẽ bị xoá khỏi Storage. Hành động này không thể hoàn
                      tác.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Huỷ</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(img)}>
                      Xoá
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          );
        })}
      </ul>

      {/* Preview dialog – dùng srcMap để đảm bảo đã fallback signed nếu cần */}
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null); // chỉ clear khi đóng
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
                onError={() => handleImgError(preview)}
                unoptimized
                priority
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
