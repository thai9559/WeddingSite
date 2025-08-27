"use client";

import { useEffect, useState } from "react";
import { uploadAlbumAction } from "./actions";
import { supabaseBrowser } from "../lib/supabase-browser";

type Album = {
  id: number;
  key: string;
  title: string;
};

export default function AdminUploadPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  // 🔄 Load albums từ Supabase khi component mount
  useEffect(() => {
    (async () => {
      const { data, error } = await supabaseBrowser
        .from("albums")
        .select("id, key, title")
        .order("id", { ascending: true });

      if (error) {
        console.error("Lỗi khi load albums:", error.message);
        return;
      }

      setAlbums(data || []);
    })();
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Admin · Upload ảnh vào album</h1>
      <p className="text-sm text-neutral-500 mt-1">
        Chọn album có sẵn, chọn ảnh (và cover nếu có), rồi bấm upload.
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
            setFiles([]);
            setCover(null);
            setSelectedAlbumId("");
          } catch (e: any) {
            setResult("❌ ERROR: " + e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {/* Dropdown chọn album */}
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
        </div>

        {/* File chọn */}
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
              required
            />
            <div className="mt-2 text-xs text-neutral-500">
              {files.length ? `${files.length} ảnh đã chọn` : "Chưa chọn ảnh"}
            </div>
          </div>
        </div>

        <button
          disabled={busy}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? "Đang upload…" : "Upload"}
        </button>

        {result && (
          <div className="rounded border mt-3 p-3 text-sm whitespace-pre-wrap">
            {result}
          </div>
        )}
      </form>
    </main>
  );
}
