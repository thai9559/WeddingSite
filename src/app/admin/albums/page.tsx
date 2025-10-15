"use client";
export const dynamic = "force-dynamic";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadAlbumAction } from "./actions";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { AdminAlbumImages } from "@/components/AdminAlbumImages";
import { toast } from "sonner";
import { fileToWebp } from "@/app/lib/img-webp";
import { Loader2, X } from "lucide-react";

type Album = { id: number; key: string; title: string };
type AlbumImage = {
  id: number;
  url: string;
  caption?: string | null;
  sort?: number | null;
};

const BUCKET = "wedding";

/** Lấy storage path tương đối (relative vào bucket) */
function extractStoragePathFromUrl(publicUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const tail = publicUrl.slice(idx + marker.length).split("?")[0];
  return decodeURIComponent(tail.replace(/^\//, ""));
}

/* ---------- WebP presets ---------- */
function getAlbumPreset() {
  return {
    maxWidth: 2048,
    maxHeight: 2048,
    targetBytes: 600_000,
    quality: 0.82,
    minQuality: 0.6,
  };
}
function getCoverPreset() {
  return {
    maxWidth: 1600,
    maxHeight: 1600,
    targetBytes: 450_000,
    quality: 0.84,
    minQuality: 0.6,
  };
}

/* ---------- error helper ---------- */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/* ---------- Overlay & Skeleton ---------- */
const FullscreenLoader = ({ text }: { text?: string }) => (
  <div className="fixed inset-0 z-[100] grid place-items-center bg-black/30 backdrop-blur-sm">
    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm font-medium">{text ?? "Đang xử lý..."}</span>
    </div>
  </div>
);
const SkeletonCard = () => (
  <div className="aspect-[4/3] w-full rounded border bg-neutral-200/70 animate-pulse" />
);

export default function AdminUploadPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");

  // Files đã nén (sẽ upload)
  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState<File | null>(null);

  // Preview trước upload (CHỈ cho ảnh album)
  const [filePreviews, setFilePreviews] = useState<
    { name: string; size: number; url: string }[]
  >([]);

  // Meta hiển thị cho cover (không preview ảnh)
  const [coverConverting, setCoverConverting] = useState(false);
  const [coverName, setCoverName] = useState<string | null>(null);
  const [coverSize, setCoverSize] = useState<number | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  // Overlay trung tâm
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");

  // Danh sách ảnh trong album
  const [images, setImages] = useState<AlbumImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [errorImages, setErrorImages] = useState("");

  // trạng thái xoá
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const selectedAlbum = useMemo(
    () => albums.find((a) => String(a.id) === selectedAlbumId),
    [albums, selectedAlbumId]
  );

  // load albums
  useEffect(() => {
    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data, error } = await supabase
          .from("albums")
          .select("id, key, title")
          .order("id", { ascending: true });
        if (error) throw error;
        setAlbums((data as Album[]) ?? []);
      } catch (err) {
        // chỉ log — không hiển thị toast để tránh ồn
        // eslint-disable-next-line no-console
        console.error("Lỗi load albums:", err);
      }
    })();
  }, []);

  const fetchImagesDual = useCallback(
    async (albumIdStr: string): Promise<AlbumImage[]> => {
      const supabase = supabaseBrowser();

      const r1 = await supabase
        .from("images")
        .select("id, url, caption, sort")
        .eq("album_id", albumIdStr)
        .order("sort", { ascending: true, nullsFirst: true })
        .order("id", { ascending: true });
      if (r1.error) throw r1.error;
      if (r1.data?.length) return (r1.data as AlbumImage[]) ?? [];

      const albumIdNum = Number(albumIdStr);
      if (!Number.isNaN(albumIdNum)) {
        const r2 = await supabase
          .from("images")
          .select("id, url, caption, sort")
          .eq("album_id", albumIdNum)
          .order("sort", { ascending: true, nullsFirst: true })
          .order("id", { ascending: true });
        if (r2.error) throw r2.error;
        return (r2.data as AlbumImage[]) ?? [];
      }
      return [];
    },
    []
  );

  const reloadImages = useCallback(
    async (albumId: string) => {
      setLoadingImages(true);
      setErrorImages("");
      try {
        const data = await fetchImagesDual(albumId);
        setImages(data || []);
      } catch (err: unknown) {
        setErrorImages(errorMessage(err) || "Không tải được ảnh.");
      } finally {
        setLoadingImages(false);
      }
    },
    [fetchImagesDual]
  );

  useEffect(() => {
    if (!selectedAlbumId) {
      setImages([]);
      setErrorImages("");
      return;
    }
    reloadImages(selectedAlbumId);
  }, [selectedAlbumId, reloadImages]);

  /* ---------- Helpers chỉ cho preview ảnh ALBUM ---------- */
  const revokeFilePreviews = useCallback(() => {
    setFilePreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }, []);

  /* ---------- Handlers ---------- */
  // COVER: không tạo preview ảnh; chỉ nén + hiển thị tên/kích thước
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setCover(null);
      setCoverName(null);
      setCoverSize(null);
      return;
    }

    const MAX_INPUT_BYTES = 20 * 1024 * 1024;
    if (f.size > MAX_INPUT_BYTES) {
      toast.info("Ảnh cover quá lớn (>20MB) đã bị bỏ qua.");
      setCover(null);
      setCoverName(null);
      setCoverSize(null);
      return;
    }

    setCover(null);
    setCoverName(f.name);
    setCoverSize(f.size);
    setCoverConverting(true);

    try {
      const webp = await fileToWebp(f, getCoverPreset());
      setCover(webp);
      setCoverName(webp.name);
      setCoverSize(webp.size);
      toast.success("Đã nén cover sang WebP");
    } catch (err: unknown) {
      toast.error("Không nén được ảnh cover", {
        description: errorMessage(err),
      });
      setCover(null);
      // vẫn giữ name/size của file gốc để người dùng thấy
    } finally {
      setCoverConverting(false);
    }
  };

  // ẢNH ALBUM: nén + tạo preview
  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = Array.from(e.target.files ?? []);
    if (!inputFiles.length) {
      setFiles([]);
      revokeFilePreviews();
      return;
    }

    const MAX_INPUT_BYTES = 20 * 1024 * 1024;
    const filtered = inputFiles.filter((f) => f.size <= MAX_INPUT_BYTES);
    if (filtered.length < inputFiles.length) {
      toast.info("Một số file > 20MB đã bị bỏ qua để đảm bảo hiệu năng.");
    }

    const processed: File[] = [];
    const previews: { name: string; size: number; url: string }[] = [];
    for (const f of filtered) {
      try {
        const webp = await fileToWebp(f, getAlbumPreset());
        processed.push(webp);
        previews.push({
          name: webp.name,
          size: webp.size,
          url: URL.createObjectURL(webp),
        });
      } catch (err: unknown) {
        toast.error(`Không nén được ảnh: ${f.name}`, {
          description: errorMessage(err),
        });
      }
    }
    setFiles(processed);

    revokeFilePreviews();
    setFilePreviews(previews);

    if (processed.length)
      toast.success(`Đã nén ${processed.length} ảnh sang WebP`);
  };

  const removeOnePreview = (idx: number) => {
    setFiles((arr) => {
      const next = [...arr];
      next.splice(idx, 1);
      return next;
    });
    setFilePreviews((arr) => {
      const next = [...arr];
      const removed = next.splice(idx, 1)[0];
      if (removed) URL.revokeObjectURL(removed.url);
      return next;
    });
    if (filesInputRef.current && filePreviews.length <= 1)
      filesInputRef.current.value = "";
  };

  const clearAllSelected = () => {
    setFiles([]);
    revokeFilePreviews();
    if (filesInputRef.current) filesInputRef.current.value = "";
  };

  const clearCoverSelected = () => {
    setCover(null);
    setCoverName(null);
    setCoverSize(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  /* ---------- Xoá ảnh (Storage + DB) có overlay ---------- */
  async function handleDeleteOne(img: AlbumImage) {
    if (!selectedAlbum?.key) return;
    setDeletingId(img.id);
    setBusy(true);
    setBusyText("Đang xoá ảnh…");
    try {
      const supabase = supabaseBrowser();

      const path = extractStoragePathFromUrl(img.url);
      if (path) {
        const { error: remErr } = await supabase.storage
          .from(BUCKET)
          .remove([path]);
        if (remErr) throw remErr;
      }

      const { error: delErr } = await supabase
        .from("images")
        .delete()
        .eq("id", img.id);
      if (delErr) throw delErr;

      setImages((prev) => prev.filter((x) => x.id !== img.id));
      toast.success("Đã xoá ảnh");
    } catch (err: unknown) {
      toast.error("Xoá ảnh thất bại", { description: errorMessage(err) });
    } finally {
      setDeletingId(null);
      setBusy(false);
      setBusyText("");
    }
  }

  /* ---------- Submit upload (có overlay) ---------- */
  const handleSubmit = async (formData: FormData) => {
    try {
      if (!selectedAlbumId) {
        toast.error("Chưa chọn album");
        return;
      }
      if (!files.length && !cover) {
        toast.error("Chưa chọn ảnh để upload");
        return;
      }

      setBusy(true);
      setBusyText("Đang upload ảnh…");

      formData.append("albumId", selectedAlbumId);
      files.forEach((f) => formData.append("files", f));
      if (cover) formData.append("cover", cover);

      const res = await uploadAlbumAction(formData);

      toast.success("Đã upload ảnh thành công", {
        description: `Tải lên ${res.uploaded.length} ảnh.`,
      });

      // reset input + previews
      clearAllSelected();
      clearCoverSelected();

      // reload list
      await reloadImages(selectedAlbumId);
    } catch (err: unknown) {
      toast.error("Upload thất bại", { description: errorMessage(err) });
    } finally {
      setBusy(false);
      setBusyText("");
    }
  };

  const totalSelectedBytes =
    filePreviews.reduce((s, f) => s + f.size, 0) + (coverSize || 0) || 0;

  return (
    <main className="mx-auto max-w-5xl p-6">
      {busy && <FullscreenLoader text={busyText} />}

      <h1 className="text-2xl font-semibold">Admin · Upload ảnh vào album</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Chọn album, chọn ảnh (và cover nếu có) → ảnh sẽ được nén về WebP trước
        khi upload.
      </p>

      <form
        className="mt-6 space-y-5"
        action={async (formData: FormData) => {
          await handleSubmit(formData);
        }}
      >
        {/* chọn album */}
        <div>
          <label className="text-xs font-medium">Chọn album</label>
          <select
            name="albumId"
            value={selectedAlbumId}
            onChange={(e) => setSelectedAlbumId(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            required
          >
            <option value="">-- Chọn một album --</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.key})
              </option>
            ))}
          </select>
          {selectedAlbum && (
            <p className="mt-1 text-xs text-neutral-500">
              Đang chọn: <b>{selectedAlbum.title}</b> · key:{" "}
              <code>{selectedAlbum.key}</code>
            </p>
          )}
        </div>

        {/* chọn file + (preview ALBUM) */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* COVER: KHÔNG preview */}
          <div>
            <label className="text-xs font-medium">Ảnh cover (optional)</label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="mt-1 w-full rounded border p-2"
            />

            {/* Thông tin cover ngắn gọn (không ảnh preview) */}
            {(coverName || coverConverting) && (
              <div className="mt-2 flex items-center justify-between text-xs text-neutral-600">
                <span className="truncate">
                  Cover · {coverName ?? "Đang xử lý..."}
                </span>
                <div className="ml-2 flex items-center gap-2">
                  {coverConverting ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Đang nén…
                    </span>
                  ) : (
                    <span>
                      {coverSize ? (coverSize / 1024).toFixed(0) : "0"} KB
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={clearCoverSelected}
                    className="underline"
                  >
                    Bỏ cover
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ALBUM IMAGES + preview */}
          <div>
            <label className="text-xs font-medium">Ảnh album</label>
            <input
              ref={filesInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesChange}
              className="mt-1 w-full rounded border p-2"
            />

            {/* summary */}
            <div className="mt-2 flex items-center justify-between text-xs text-neutral-600">
              <span>
                {filePreviews.length ? (
                  <>
                    <b>{filePreviews.length}</b> ảnh đã chọn
                  </>
                ) : (
                  "Chưa chọn ảnh"
                )}
              </span>
              <span>
                {totalSelectedBytes
                  ? `~${(totalSelectedBytes / 1024 / 1024).toFixed(2)} MB`
                  : ""}
              </span>
            </div>

            {/* previews grid (ALBUM) */}
            {!!filePreviews.length && (
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {filePreviews.map((p, i) => (
                  <div
                    key={`${p.name}-${i}`}
                    className="group relative overflow-hidden rounded-lg border bg-white"
                  >
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={p.url}
                        alt={p.name}
                        fill
                        sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                        className="object-cover"
                        unoptimized
                        loading="lazy"
                        // decoding prop không có trên next/image, giữ mặc định lazy
                      />
                    </div>

                    {/* overlay hover nhẹ */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 transition group-hover:opacity-100" />

                    {/* nút xoá */}
                    <button
                      type="button"
                      onClick={() => removeOnePreview(i)}
                      className="absolute right-1 top-1 inline-flex items-center rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      title="Bỏ ảnh này khỏi danh sách"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* nhãn */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1 text-[10px] text-white">
                      <span className="line-clamp-1">{p.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!!filePreviews.length && (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={clearAllSelected}
                >
                  Bỏ tất cả ảnh
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            disabled={busy}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? "Đang upload…" : "Upload"}
          </button>
        </div>
      </form>

      {/* Danh sách ảnh trong album */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Ảnh trong album</h2>
        <p className="text-xs text-neutral-500">
          {loadingImages
            ? "Đang tải..."
            : errorImages
            ? `Lỗi: ${errorImages}`
            : `${images.length} ảnh`}
        </p>

        {loadingImages ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <AdminAlbumImages
            images={images}
            deletingId={deletingId}
            onDelete={handleDeleteOne}
          />
        )}
      </section>
    </main>
  );
}
