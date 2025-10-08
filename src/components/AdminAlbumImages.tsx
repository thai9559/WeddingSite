"use client";

import * as React from "react";
import type { FC } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner";

export type AlbumImage = {
  id: number;
  url: string;
  caption?: string | null;
  sort?: number | null;
};

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
  // đánh dấu ảnh load lỗi -> render badge/viền đỏ
  const [errorMap, setErrorMap] = React.useState<Record<number, boolean>>({});

  React.useEffect(() => {
    // reset error map khi danh sách ảnh thay đổi
    const init: Record<number, boolean> = {};
    images.forEach((img) => (init[img.id] = false));
    setErrorMap(init);
  }, [images]);

  if (!images?.length) return null;

  return (
    <>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {images.map((img) => {
          const isErr = !!errorMap[img.id];
          return (
            <li
              key={img.id}
              className={[
                "group relative overflow-hidden rounded border bg-white",
                isErr ? "border-red-400" : "border-neutral-200",
              ].join(" ")}
            >
              {/* Ảnh thumbnail */}
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={img.url}
                  alt={img.caption ?? ""}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="cursor-zoom-in object-cover object-top"
                  onClick={() => setPreview(img)}
                  onError={() => setErrorMap((m) => ({ ...m, [img.id]: true }))}
                  // Trang admin: không cần tối ưu CDN ngay, tránh phải cấu hình domains
                  unoptimized
                  priority={false}
                />
                {isErr && (
                  <div className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[11px] text-white">
                    Load lỗi
                  </div>
                )}
              </div>

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
                      Ảnh sẽ bị xoá khỏi Storage và khỏi bảng{" "}
                      <code>images</code>. Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Huỷ</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        try {
                          await onDelete(img);
                          toast.success("Đã xoá ảnh.");
                        } catch (err: unknown) {
                          const msg =
                            err instanceof Error
                              ? err.message
                              : "Có lỗi xảy ra khi xoá ảnh.";
                          toast.error("Xoá ảnh thất bại", {
                            description: msg,
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
          );
        })}
      </ul>

      {/* Dialog xem ảnh lớn */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-[90vw] bg-white p-0 sm:max-w-3xl">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Ảnh xem trước</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {preview && (
              <Image
                src={preview.url}
                alt={preview.caption ?? ""}
                width={1600}
                height={1200}
                sizes="90vw"
                className="h-auto max-h-[75vh] w-full rounded-md object-contain"
                unoptimized
                priority
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
