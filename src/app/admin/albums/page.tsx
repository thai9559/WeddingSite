"use client";
export const dynamic = "force-dynamic";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadAlbumAction, deleteAlbumImageAction } from "./actions";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { AdminAlbumImages } from "@/components/AdminAlbumImages";
import { toast } from "sonner";
import { fileToWebp } from "@/app/lib/img-webp";
import { Loader2, X } from "lucide-react";

/* ============================================================
   TYPES
   ============================================================ */
type Album = { id: number; key: string; title: string };
type AlbumImage = {
  id: number;
  url: string;
  caption?: string | null;
  sort?: number | null;
};

/* ============================================================
   UI HELPERS – FULLSCREEN LOADER
   ============================================================ */
const FullscreenLoader = ({ text }: { text?: string }) => (
  <div className="fixed inset-0 z-[200] grid place-items-center bg-black/40 backdrop-blur-sm">
    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-[15px] font-medium">{text ?? "Đang xử lý..."}</span>
    </div>
  </div>
);

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function AdminUploadPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState<File | null>(null);

  const [filePreviews, setFilePreviews] = useState<
    { name: string; size: number; url: string }[]
  >([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const filesInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<AlbumImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");

  const [confirmUpload, setConfirmUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const selectedAlbum = useMemo(
    () => albums.find((a) => String(a.id) === selectedAlbumId),
    [albums, selectedAlbumId]
  );

  /* ============================================================
     LOAD ALBUM LIST
     ============================================================ */
  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      const { data } = await supabase
        .from("albums")
        .select("id, key, title")
        .order("id");

      setAlbums((data as Album[]) ?? []);
    })();
  }, []);

  /* ============================================================
     FETCH ALBUM IMAGES
     ============================================================ */
  const fetchImages = useCallback(async (albumId: number) => {
    const supabase = supabaseBrowser();
    const { data } = await supabase
      .from("images")
      .select("id, url, caption, sort")
      .eq("album_id", albumId)
      .order("sort", { ascending: true, nullsFirst: true })
      .order("id");

    return (data as AlbumImage[]) ?? [];
  }, []);

  const reloadImages = useCallback(
    async (idStr: string) => {
      setLoadingImages(true);
      try {
        const id = Number(idStr);
        if (!id) return;

        const rows = await fetchImages(id);
        setImages(rows);
      } finally {
        setLoadingImages(false);
      }
    },
    [fetchImages]
  );

  useEffect(() => {
    if (selectedAlbumId) reloadImages(selectedAlbumId);
  }, [selectedAlbumId, reloadImages]);

  /* ============================================================
     HANDLE COVER CHANGE
     ============================================================ */
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const webp = await fileToWebp(f, {
      maxWidth: 1600,
      maxHeight: 1600,
      targetBytes: 450_000,
      quality: 0.84,
      minQuality: 0.6,
    });

    setCover(webp);
  };

  /* ============================================================
     FILE PREVIEW
     ============================================================ */
  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Array.from(e.target.files ?? []);
    const input: File[] = raw.filter((x): x is File => x instanceof File);
    if (!input.length) return;

    setLoadingPreview(true);

    const processed: File[] = [];
    const previews: { name: string; size: number; url: string }[] = [];

    for (const f of input) {
      const webp = await fileToWebp(f, {
        maxWidth: 2048,
        maxHeight: 2048,
        targetBytes: 600_000,
        quality: 0.82,
        minQuality: 0.6,
      });

      processed.push(webp);
      previews.push({
        name: webp.name,
        size: webp.size,
        url: URL.createObjectURL(webp),
      });
    }

    setFiles(processed);
    setFilePreviews(previews);
    setLoadingPreview(false);
  };

  const removePreview = (i: number) => {
    setFiles((arr) => arr.filter((_, idx) => idx !== i));
    setFilePreviews((arr) => {
      const next = [...arr];
      URL.revokeObjectURL(next[i].url);
      next.splice(i, 1);
      return next;
    });
  };

  /* ============================================================
     DELETE ONE IMAGE
     ============================================================ */
  async function handleDeleteOne(img: AlbumImage) {
    if (!selectedAlbum) return;

    try {
      setDeletingId(img.id);
      setBusy(true);
      setBusyText("Đang xoá ảnh…");

      await deleteAlbumImageAction(img.id, img.url);

      setImages((prev) => prev.filter((x) => x.id !== img.id));
      toast.success("Đã xoá ảnh");
    } catch (err: any) {
      toast.error("Lỗi xoá ảnh", { description: err.message || String(err) });
    } finally {
      setDeletingId(null);
      setBusy(false);
      setBusyText("");
    }
  }

  /* ============================================================
     UPLOAD PROCESS
     ============================================================ */
  const startUpload = async () => {
    if (!selectedAlbumId) {
      toast.error("Chưa chọn album");
      return;
    }

    setBusy(true);
    setBusyText("Đang upload…");

    const formData = new FormData();
    if (cover) formData.append("cover", cover);
    files.forEach((f) => formData.append("files", f));
    formData.append("albumId", selectedAlbumId);

    try {
      const res = await uploadAlbumAction(formData);

      toast.success("Upload thành công", {
        description: `${res.uploaded.length} ảnh`,
      });

      setCover(null);
      setFiles([]);
      setFilePreviews([]);

      await reloadImages(selectedAlbumId);
    } catch (err: any) {
      toast.error("Upload thất bại", {
        description: err.message || String(err),
      });
    }

    setBusy(false);
  };

  /* ============================================================
     RENDER UI
     ============================================================ */
  return (
    <main className="mx-auto max-w-5xl p-6">
      {busy && <FullscreenLoader text={busyText} />}

      <h1 className="text-2xl font-semibold">Admin · Upload ảnh album</h1>

      {/* FORM UPLOAD */}
      <form className="mt-6 space-y-5" onSubmit={(e) => e.preventDefault()}>
        {/* SELECT ALBUM */}
        <div>
          <label className="text-xs font-medium">Chọn album</label>
          <select
            value={selectedAlbumId}
            onChange={(e) => setSelectedAlbumId(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          >
            <option value="">-- Chọn album --</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.key})
              </option>
            ))}
          </select>
        </div>

        {/* COVER + FILE UPLOAD */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* COVER */}
          <div>
            <label className="text-xs font-medium">Ảnh cover</label>
            <input
              type="file"
              accept="image/*"
              ref={coverInputRef}
              onChange={handleCoverChange}
              className="mt-1 w-full p-2 border rounded"
            />

            {cover && (
              <p className="text-xs mt-1">
                {cover.name} — {(cover.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          {/* ALBUM IMAGES */}
          <div>
            <label className="text-xs font-medium">Ảnh album</label>

            <div className="relative mt-1">
              <input
                type="file"
                accept="image/*"
                ref={filesInputRef}
                multiple
                onChange={handleFilesChange}
                className="w-full p-2 border rounded"
              />

              {!!filePreviews.length && (
                <div className="grid grid-cols-2 gap-3 mt-3 sm:grid-cols-3 md:grid-cols-4">
                  {filePreviews.map((p, i) => (
                    <div
                      key={p.name + i}
                      className="relative rounded-lg border overflow-hidden group"
                    >
                      <div className="relative aspect-[4/3] w-full">
                        <Image
                          src={p.url}
                          alt={p.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removePreview(i)}
                        className="absolute right-1 top-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {loadingPreview && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded z-20">
                  <Loader2 className="animate-spin w-8 h-8 text-neutral-600" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* UPLOAD BUTTON */}
        <button
          type="button"
          className="px-4 py-2 bg-black text-white rounded"
          onClick={() => {
            if (!files.length && !cover) {
              toast.error("Bạn chưa chọn ảnh");
              return;
            }
            setConfirmUpload(true);
          }}
        >
          Upload
        </button>
      </form>

      {/* GALLERY */}
      <section className="mt-10 min-h-[420px]">
        <h2 className="text-lg font-semibold">Ảnh trong album</h2>

        <div className="relative mt-3">
          <AdminAlbumImages
            images={images}
            onDelete={handleDeleteOne}
            deletingId={deletingId}
          />

          {loadingImages && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-20">
              <Loader2 className="animate-spin w-8 h-8 text-neutral-600" />
            </div>
          )}
        </div>
      </section>

      {/* CONFIRM UPLOAD POPUP */}
      {confirmUpload && (
        <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-[90%] max-w-sm shadow-xl text-center">
            <p className="font-medium text-lg">Xác nhận upload?</p>
            <p className="text-sm text-neutral-500 mt-2">
              Bạn sắp upload {files.length} ảnh.
            </p>

            <div className="flex gap-3 mt-5 justify-center">
              <button
                className="px-4 py-2 rounded border"
                onClick={() => setConfirmUpload(false)}
              >
                Hủy
              </button>

              <button
                className="px-4 py-2 rounded bg-black text-white"
                onClick={async () => {
                  setConfirmUpload(false);
                  await startUpload();
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
