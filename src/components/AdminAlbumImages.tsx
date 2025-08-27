"use client";

import * as React from "react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

export type AlbumImage = {
  id: number;
  url: string;
  caption?: string | null;
  sort?: number | null;
};
import { toast } from "sonner";

type Props = {
  images: AlbumImage[];
  deletingId: number | null;
  /** onDelete có thể trả Promise; throw để báo lỗi */
  onDelete: (img: AlbumImage) => Promise<void> | void;
};

export const AdminAlbumImages: FC<Props> = ({
  images,
  deletingId,
  onDelete,
}) => {
  const [preview, setPreview] = React.useState<AlbumImage | null>(null);

  if (!images?.length) return null;

  return (
    <>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {images.map((img) => (
          <li
            key={img.id}
            className="group relative overflow-hidden rounded border bg-white"
          >
            {/* Ảnh thumbnail */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.caption ?? ""}
              className="aspect-[4/3] w-full cursor-zoom-in object-cover object-top"
              loading="lazy"
              onClick={() => setPreview(img)}
              onError={(e) => {
                const li = e.currentTarget.closest("li") as HTMLElement | null;
                if (li) {
                  li.classList.add("border-red-400");
                  const badge = document.createElement("div");
                  badge.className =
                    "absolute left-2 top-2 bg-red-600 text-white text-[11px] px-1.5 py-0.5 rounded";
                  badge.textContent = "Load lỗi";
                  li.appendChild(badge);
                }
              }}
            />

            {/* Overlay nút xem/zoom (hover) */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
              <Button
                variant="secondary"
                size="sm"
                className="pointer-events-auto"
                onClick={() => setPreview(img)}
              >
                Xem ảnh
              </Button>
            </div>

            {/* Nút xoá (kèm xác nhận) */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deletingId === img.id}
                  className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100"
                  title="Xoá ảnh khỏi Storage và DB"
                >
                  {deletingId === img.id ? "Đang xoá…" : "Xoá"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận xoá ảnh?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ảnh sẽ bị xoá khỏi Storage và khỏi bảng <code>images</code>.
                    Hành động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Huỷ</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      try {
                        await onDelete(img);
                        toast.success("Đã xoá ảnh.");
                      } catch (err: any) {
                        toast.error("Xoá ảnh thất bại", {
                          description:
                            err?.message || "Có lỗi xảy ra khi xoá ảnh.",
                        });
                      }
                    }}
                  >
                    Xoá
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </li>
        ))}
      </ul>

      {/* Dialog xem ảnh lớn */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-[90vw] bg-white p-0 sm:max-w-3xl">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Ảnh xem trước</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview && (
              <img
                src={preview.url}
                alt={preview.caption ?? ""}
                className="h-auto max-h-[75vh] w-full rounded-md object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
