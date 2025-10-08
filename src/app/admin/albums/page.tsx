"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { uploadAlbumAction } from "./actions";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { AdminAlbumImages } from "@/components/AdminAlbumImages";
import { toast } from "sonner";

type Album = { id: number; key: string; title: string };
type AlbumImage = {
  id: number;
  url: string;
  caption?: string | null;
  sort?: number | null;
};

// ✅ Đồng bộ với server action: bucket "wedding" + path "albums/<albumKey>/..."
const BUCKET = "wedding";

/** Lấy storage path tương đối (relative vào bucket), đồng bộ với server. */
function extractStoragePathFromUrl(publicUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const tail = publicUrl.slice(idx + marker.length).split("?")[0];
  return decodeURIComponent(tail.replace(/^\//, ""));
}

export default function AdminUploadPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  // preview ảnh
  const [images, setImages] = useState<AlbumImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [errorImages, setErrorImages] = useState("");

  // resync/delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const selectedAlbum = useMemo(
    () => albums.find((a) => String(a.id) === selectedAlbumId),
    [albums, selectedAlbumId]
  );

  // 🔄 load danh sách album
  useEffect(() => {
    (async () => {
      const { data, error } = await supabaseBrowser
        .from("albums")
        .select("id, key, title")
        .order("id", { ascending: true });

      if (!error) setAlbums((data as Album[]) || []);
      else console.error("Lỗi load albums:", error.message);
    })();
  }, []);

  /** Truy vấn ảnh an toàn: thử string -> nếu trống, thử number */
  const fetchImagesDual = useCallback(
    async (albumIdStr: string): Promise<AlbumImage[]> => {
      // 1) string
      const r1 = await supabaseBrowser
        .from("images")
        .select("id, url, caption, sort")
        .eq("album_id", albumIdStr)
        .order("sort", { ascending: true, nullsFirst: true })
        .order("id", { ascending: true });

      if (r1.error) throw r1.error;
      if (r1.data?.length) return (r1.data as AlbumImage[]) ?? [];

      // 2) number
      const albumIdNum = Number(albumIdStr);
      if (!Number.isNaN(albumIdNum)) {
        const r2 = await supabaseBrowser
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

  // 🔄 load ảnh của album đang chọn
  const reloadImages = useCallback(
    async (albumId: string) => {
      setLoadingImages(true);
      setErrorImages("");
      try {
        const data = await fetchImagesDual(albumId);
        setImages(data || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Không tải được ảnh.";
        setErrorImages(msg);
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
    // ✅ thêm reloadImages vào deps theo lint
    reloadImages(selectedAlbumId);
  }, [selectedAlbumId, result, reloadImages]);

  // ❌ Xoá 1 ảnh: Storage + DB
  async function handleDeleteOne(img: AlbumImage) {
    if (!selectedAlbum?.key) return;
    setDeletingId(img.id);
    try {
      const path = extractStoragePathFromUrl(img.url); // "albums/<key>/file.jpg"
      if (path) {
        const { error: remErr } = await supabaseBrowser.storage
          .from(BUCKET)
          .remove([path]);
        if (remErr) throw remErr;
      }
      const { error: delErr } = await supabaseBrowser
        .from("images")
        .delete()
        .eq("id", img.id);
      if (delErr) throw delErr;

      setImages((prev) => prev.filter((x) => x.id !== img.id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Xoá ảnh lỗi: " + msg);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Admin · Upload ảnh vào album</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Chọn album, chọn ảnh (và cover nếu có), rồi upload.
      </p>

      <form
        className="mt-6 space-y-5"
        action={async (formData: FormData) => {
          try {
            setBusy(true);
            if (!selectedAlbumId) throw new Error("Bạn chưa chọn album.");
            formData.append("albumId", selectedAlbumId);
            files.forEach((f) => formData.append("files", f));
            if (cover) formData.append("cover", cover);

            const res = await uploadAlbumAction(formData);
            setResult(
              `✅ OK · albumId=${res.albumId} · uploaded=${res.uploaded.length}`
            );
            toast.success("Đã upload ảnh thành công", {
              description: `Tải lên ${res.uploaded.length} ảnh.`,
            });

            // reset input
            setFiles([]);
            setCover(null);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setResult("❌ ERROR: " + msg);
          } finally {
            setBusy(false);
          }
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

        {/* chọn file */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Ảnh cover (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded border p-2"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Ảnh album</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="mt-1 w-full rounded border p-2"
            />
            <div className="mt-2 text-xs text-neutral-500">
              {files.length ? `${files.length} ảnh đã chọn` : "Chưa chọn ảnh"}
            </div>
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

        {result && (
          <div className="mt-3 whitespace-pre-wrap rounded border p-3 text-sm">
            {result}
          </div>
        )}
      </form>

      {/* Preview ảnh (đã tách component) */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Ảnh trong album</h2>
        <p className="text-xs text-neutral-500">
          {loadingImages
            ? "Đang tải..."
            : errorImages
            ? `Lỗi: ${errorImages}`
            : `${images.length} ảnh`}
        </p>

        <AdminAlbumImages
          images={images}
          deletingId={deletingId}
          onDelete={handleDeleteOne}
        />
      </section>
    </main>
  );
}
