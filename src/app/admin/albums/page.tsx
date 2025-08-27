"use client";

import { useEffect, useMemo, useState } from "react";
import { uploadAlbumAction } from "./actions";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { AdminAlbumImages } from "@/components/AdminAlbumImages";
type Album = { id: number; key: string; title: string };
type AlbumImage = {
  id: number;
  url: string;
  caption?: string | null;
  sort?: number | null;
};
import { toast } from "sonner";

// ✅ Đồng bộ với server action: bucket "wedding" + path "albums/<albumKey>/..."
const BUCKET = "wedding";
const FOLDER_PREFIX = "albums";

/** Lấy storage path tương đối (relative vào bucket), đồng bộ với server. */
function extractStoragePathFromUrl(publicUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const tail = publicUrl.slice(idx + marker.length).split("?")[0];
  return decodeURIComponent(tail.replace(/^\//, ""));
}

/** Liệt kê đệ quy toàn bộ file path trong 1 folder của bucket. */
async function listAllPaths(bucket: string, folder: string): Promise<string[]> {
  const paths: string[] = [];
  const stack: string[] = [folder.replace(/^\/+|\/+$/g, "")];

  while (stack.length) {
    const cur = stack.pop()!;
    const { data, error } = await supabaseBrowser.storage
      .from(bucket)
      .list(cur || "", {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });
    if (error) throw error;

    for (const item of data ?? []) {
      const it: any = item;
      const isFolder = it.id == null;
      if (isFolder) {
        const sub = [cur, it.name]
          .filter(Boolean)
          .join("/")
          .replace(/\/+$/g, "");
        if (sub && sub !== cur) stack.push(sub);
      } else {
        const p = [cur, it.name].filter(Boolean).join("/");
        paths.push(p.replace(/^\/+/, ""));
      }
    }
  }
  return paths;
}

/** Helper: unique by key */
function uniqueBy<T, K extends string | number>(arr: T[], getKey: (x: T) => K) {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const it of arr) {
    const k = getKey(it);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
}

export default function AdminUploadPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  // preview ảnh
  const [images, setImages] = useState<AlbumImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [errorImages, setErrorImages] = useState("");

  // resync/delete state
  const [syncing, setSyncing] = useState(false);
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
      if (!error) setAlbums(data || []);
      else console.error("Lỗi load albums:", error.message);
    })();
  }, []);

  /** Truy vấn ảnh an toàn: thử string -> nếu trống, thử number */
  async function fetchImagesDual(albumIdStr: string) {
    // 1) string
    let { data, error } = await supabaseBrowser
      .from("images")
      .select("id, url, caption, sort")
      .eq("album_id", albumIdStr)
      .order("sort", { ascending: true, nullsFirst: true })
      .order("id", { ascending: true });
    if (error) throw error;
    if (data?.length) return data;

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
      return r2.data || [];
    }
    return [];
  }

  // 🔄 load ảnh của album đang chọn
  async function reloadImages(albumId: string) {
    setLoadingImages(true);
    setErrorImages("");
    try {
      const data = await fetchImagesDual(albumId);
      setImages(data || []);
    } catch (e: any) {
      setErrorImages(e.message || "Không tải được ảnh.");
    } finally {
      setLoadingImages(false);
    }
  }

  useEffect(() => {
    if (!selectedAlbumId) {
      setImages([]);
      setErrorImages("");
      return;
    }
    reloadImages(selectedAlbumId);
  }, [selectedAlbumId, result]);

  /** Lấy rows images theo album_id với dual-lookup */
  async function fetchRowsByAlbumIdDual(albumIdStr: string) {
    const out: { id: number; url: string }[] = [];

    const r1 = await supabaseBrowser
      .from("images")
      .select("id, url")
      .eq("album_id", albumIdStr);
    if (!r1.error && r1.data) out.push(...r1.data);

    const albumIdNum = Number(albumIdStr);
    if (!Number.isNaN(albumIdNum)) {
      const r2 = await supabaseBrowser
        .from("images")
        .select("id, url")
        .eq("album_id", albumIdNum);
      if (!r2.error && r2.data) out.push(...r2.data);
    }

    return uniqueBy(out, (x) => x.id);
  }

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
    } catch (e: any) {
      alert("Xoá ảnh lỗi: " + (e.message || e));
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
          } catch (e: any) {
            setResult("❌ ERROR: " + e.message);
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
              onChange={(e) => setCover(e.target.files?.[0] || null)}
              className="mt-1 w-full rounded border p-2"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Ảnh album</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
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
