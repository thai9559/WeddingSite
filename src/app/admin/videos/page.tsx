// src/app/admin/videos/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabaseBrowser } from "@/app/lib/supabase-browser";

type Category = "pre_wedding" | "wedding";

type Video = {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  category: Category;
};

const BUCKET = "wedding";
const categoryToFolder = (c: Category) =>
  c === "pre_wedding" ? "prewedding" : "wedding";

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<Category>("pre_wedding");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");

  const fetchVideos = async () => {
    const { data, error } = await supabaseBrowser
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }
    setVideos((data as Video[]) ?? []);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!videoFile || !thumbFile || !title.trim()) {
      alert("Vui lòng chọn đầy đủ thông tin (video, thumbnail, tiêu đề).");
      return;
    }

    try {
      setUploading(true);

      const folder = categoryToFolder(category);
      const now = Date.now();
      const videoPath = `videos/${folder}/${now}-${videoFile.name}`;
      const thumbPath = `videos/thumbnails/${folder}-${now}-${thumbFile.name}`;

      // Upload video
      const { error: videoErr } = await supabaseBrowser.storage
        .from(BUCKET)
        .upload(videoPath, videoFile, { upsert: true });
      if (videoErr) throw videoErr;

      const { data: videoPub } = supabaseBrowser.storage
        .from(BUCKET)
        .getPublicUrl(videoPath);
      const videoUrl = videoPub.publicUrl;

      // Upload thumbnail
      const { error: thumbErr } = await supabaseBrowser.storage
        .from(BUCKET)
        .upload(thumbPath, thumbFile, { upsert: true });
      if (thumbErr) throw thumbErr;

      const { data: thumbPub } = supabaseBrowser.storage
        .from(BUCKET)
        .getPublicUrl(thumbPath);
      const thumbUrl = thumbPub.publicUrl;

      // Insert DB
      const { error: insertErr } = await supabaseBrowser.from("videos").insert({
        title: title.trim(),
        video_url: videoUrl,
        thumbnail_url: thumbUrl,
        category,
      });
      if (insertErr) throw insertErr;

      await fetchVideos();
      setVideoFile(null);
      setThumbFile(null);
      setTitle("");
      alert("✅ Upload thành công!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không xác định";
      console.error(err);
      alert("❌ Lỗi upload: " + msg);
    } finally {
      setUploading(false);
    }
  }

  const preWedding = videos.filter((v) => v.category === "pre_wedding");
  const wedding = videos.filter((v) => v.category === "wedding");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">🎬 Quản lý Video</h1>

      {/* --- Upload form --- */}
      <form
        onSubmit={handleUpload}
        className="mb-10 rounded-xl border p-5 bg-white shadow-sm"
      >
        <h2 className="text-lg font-medium mb-4">⬆️ Upload video mới</h2>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-1">Tiêu đề</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border p-2"
              placeholder="Nhập tiêu đề video"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Phân loại</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full rounded-md border p-2"
            >
              <option value="pre_wedding">💍 Pre-Wedding</option>
              <option value="wedding">🎉 Wedding</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Chọn video</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              className="w-full border rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Thumbnail</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
              className="w-full border rounded-md p-2"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="px-4 py-2 rounded-md bg-black text-white hover:opacity-80 disabled:opacity-50"
        >
          {uploading ? "Đang upload..." : "Tải lên"}
        </button>
      </form>

      {/* --- Danh sách --- */}
      <div className="grid md:grid-cols-2 gap-8">
        <VideoList title="💍 Pre-Wedding" videos={preWedding} />
        <VideoList title="🎉 Wedding Day" videos={wedding} />
      </div>
    </div>
  );
}

function VideoList({ title, videos }: { title: string; videos: Video[] }) {
  return (
    <div>
      <h2 className="text-xl font-medium mb-3 text-neutral-700">{title}</h2>
      <div className="space-y-3">
        {videos.map((v) => {
          const src = v.thumbnail_url ?? "/placeholder.jpg";
          return (
            <div
              key={v.id}
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-neutral-50"
            >
              <Image
                src={src}
                alt={v.title}
                width={96} // ~ w-24
                height={64} // ~ h-16
                className="rounded object-cover"
              />
              <div>
                <div className="font-medium">{v.title}</div>
                <a
                  href={v.video_url}
                  className="text-sm text-blue-600"
                  target="_blank"
                  rel="noreferrer"
                >
                  Xem video
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
