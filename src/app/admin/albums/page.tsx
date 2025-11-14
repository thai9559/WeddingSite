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

const BUCKET = "wedding";

/* ============================================================
   HELPERS
   ============================================================ */
function extractStoragePathFromUrl(publicUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length).split("?")[0]);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/* ============================================================
   UI HELPERS
   ============================================================ */
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

/* ============================================================
   CHECK FILE EXIST – CLEAN ORPHAN DB ROWS
   ============================================================ */
async function checkFileExists(path: string): Promise<boolean> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 30);
  return !!data?.signedUrl && !error;
}

async function pruneOrphans(rows: AlbumImage[]): Promise<AlbumImage[]> {
  const supabase = supabaseBrowser();

  const checks = await Promise.all(
    rows.map(async (r) => {
      const path = extractStoragePathFromUrl(r.url);
      if (!path) return { r, ok: false };
      const ok = await checkFileExists(path).catch(() => false);
      return { r, ok };
    })
  );

  const orphanIds = checks.filter((c) => !c.ok).map((c) => c.r.id);
  const validRows = checks.filter((c) => c.ok).map((c) => c.r);

  if (orphanIds.length) {
    await supabase.from("images").delete().in("id", orphanIds);
    console.log("🔥 CLEAN ORPHAN ROWS", orphanIds);
  }

  return validRows;
}

/* ============================================================
   PAGE
   ============================================================ */
export default function AdminUploadPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState<File | null>(null);

  const [filePreviews, setFilePreviews] = useState<
    { name: string; size: number; url: string }[]
  >([]);

  const filesInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<AlbumImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");

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
     FETCH IMAGES + CLEAN ORPHANS
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
        if (!id) {
          setImages([]);
          return;
        }
        let rows = await fetchImages(id);
        rows = await pruneOrphans(rows);
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
     HANDLE COVER
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
     HANDLE MULTIPLE IMAGES
     ============================================================ */
  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Array.from(e.target.files ?? []);
    const input: File[] = raw.filter((x): x is File => x instanceof File);

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
  async function handleDeleteOne(img: AlbumImage): Promise<void> {
    if (!selectedAlbum) return;

    try {
      setDeletingId(img.id);
      setBusy(true);
      setBusyText("Đang xoá ảnh…");

      await deleteAlbumImageAction(img.id, img.url);
      setImages((prev) => prev.filter((x) => x.id !== img.id));
      toast.success("Đã xoá ảnh");
    } catch (err) {
      toast.error("Xoá ảnh thất bại", { description: errorMessage(err) });
    } finally {
      setDeletingId(null);
      setBusy(false);
      setBusyText("");
    }
  }

  /* ============================================================
     SUBMIT UPLOAD (MUST RETURN Promise<void>)
     ============================================================ */
  const handleSubmit = async (formData: FormData): Promise<void> => {
    if (!selectedAlbumId) {
      toast.error("Chưa chọn album");
      return;
    }

    setBusy(true);
    setBusyText("Đang upload…");

    if (cover) formData.append("cover", cover);
    files.forEach((f) => formData.append("files", f));
    formData.append("albumId", selectedAlbumId);

    const res = await uploadAlbumAction(formData);

    toast.success("Upload thành công", {
      description: `${res.uploaded.length} ảnh`,
    });

    setCover(null);
    setFiles([]);
    setFilePreviews([]);

    await reloadImages(selectedAlbumId);
    setBusy(false);
  };

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <main className="mx-auto max-w-5xl p-6">
      {busy && <FullscreenLoader text={busyText} />}

      <h1 className="text-2xl font-semibold">Admin · Upload ảnh album</h1>

      {/* FORM UPLOAD */}
      <form
        className="mt-6 space-y-5"
        action={async (fd: FormData) => {
          await handleSubmit(fd);
          return;
        }}
      >
        {/* ALBUM SELECT */}
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

        {/* COVER + MULTI IMAGES */}
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
            <input
              type="file"
              accept="image/*"
              ref={filesInputRef}
              multiple
              onChange={handleFilesChange}
              className="mt-1 w-full p-2 border rounded"
            />

            {!!filePreviews.length && (
              <>
                <p className="text-xs mt-1">
                  {filePreviews.length} ảnh đã chọn
                </p>

                <div className="grid grid-cols-2 gap-3 mt-2 sm:grid-cols-3 md:grid-cols-4">
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
              </>
            )}
          </div>
        </div>

        <button className="px-4 py-2 bg-black text-white rounded">
          Upload
        </button>
      </form>

      {/* LIST IMAGES */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Ảnh trong album</h2>

        {loadingImages ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <AdminAlbumImages
            images={images}
            onDelete={handleDeleteOne}
            deletingId={deletingId}
          />
        )}
      </section>
    </main>
  );
}
