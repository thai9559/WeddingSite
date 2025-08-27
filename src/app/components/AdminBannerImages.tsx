"use client";

import * as React from "react";
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

export type BannerImage = {
  id: number;
  path: string; // path trong bucket (ví dụ: banners/home/pc/xxx.jpg)
  url: string; // URL build từ path (public trước)
  device: string;
  location: string;
};

type Props = {
  images: BannerImage[];
  onDelete: (img: BannerImage) => void;
  deletingId: number | null;
};

const BUCKET = "wedding";

// tạo signed URL khi public URL fail
async function createSignedUrl(path: string, expires = 60 * 10) {
  const { data, error } = await supabaseBrowser.storage
    .from(BUCKET)
    .createSignedUrl(path, expires);
  if (error || !data?.signedUrl)
    throw error ?? new Error("Không tạo được signed URL");
  return data.signedUrl;
}

export function AdminBannerImages({ images, onDelete, deletingId }: Props) {
  const [preview, setPreview] = React.useState<BannerImage | null>(null);

  // map hiện tại id -> src (public hoặc signed nếu đã fallback)
  const [srcMap, setSrcMap] = React.useState<Record<number, string>>({});
  // đánh dấu đã thử signed cho ảnh nào để tránh loop vô hạn
  const [triedSigned, setTriedSigned] = React.useState<Record<number, boolean>>(
    {}
  );

  // reset mỗi khi danh sách ảnh đổi
  React.useEffect(() => {
    const init: Record<number, string> = {};
    images.forEach((img) => (init[img.id] = img.url));
    setSrcMap(init);
    setTriedSigned({});
  }, [images]);

  // fallback: khi ảnh public 403/404 -> xin signed URL rồi cập nhật src
  async function handleImgError(img: BannerImage) {
    if (!img?.path) return;
    if (triedSigned[img.id]) return; // đã cố signed rồi thì thôi
    try {
      const signed = await createSignedUrl(img.path);
      setSrcMap((m) => ({ ...m, [img.id]: signed }));
      setTriedSigned((m) => ({ ...m, [img.id]: true }));
    } catch {
      // có thể set placeholder nếu muốn
    }
  }

  if (!images.length)
    return (
      <p className="text-sm text-neutral-500 mt-3">
        Chưa có ảnh cho vị trí/thiết bị này.
      </p>
    );

  return (
    <>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {images.map((img) => {
          const currentSrc = srcMap[img.id] ?? img.url;
          return (
            <li
              key={img.id}
              className="group relative overflow-hidden rounded border bg-white"
            >
              <img
                src={currentSrc}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full object-cover cursor-zoom-in"
                onClick={() => setPreview(img)}
                onError={() => handleImgError(img)}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition">
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
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-[90vw] bg-white p-0 sm:max-w-3xl">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Xem ảnh banner</DialogTitle>
            <DialogDescription>{preview?.path || ""}</DialogDescription>
          </DialogHeader>
          <div className="p-4">
            {preview && (
              <img
                src={srcMap[preview.id] ?? preview.url}
                alt=""
                className="h-auto max-h-[75vh] w-full rounded object-contain"
                onError={() => handleImgError(preview)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
