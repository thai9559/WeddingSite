"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { addVideoAction, deleteVideoAction, type VideoType } from "./actions";
import {
  extractYouTubeId,
  extractVimeoId,
  getYouTubeThumbnail,
  getEmbedUrl,
  getVideoType,
} from "./utils";
import { toast } from "sonner";
import { Loader2, Trash2, Play, ExternalLink } from "lucide-react";

type Video = {
  video_id: string;
  type: VideoType;
  url: string;
  path: string;
  created_at: string;
};

const BUCKET = "wedding";

const FullscreenLoader = ({ text }: { text?: string }) => (
  <div className="fixed inset-0 z-[100] grid place-items-center bg-black/30 backdrop-blur-sm">
    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm font-medium">{text ?? "Đang xử lý..."}</span>
    </div>
  </div>
);

const SkeletonCard = () => (
  <div className="aspect-video w-full animate-pulse rounded-lg border bg-neutral-200/70" />
);

export default function VideosPage() {
  const [activeTab, setActiveTab] = useState<VideoType>("prewedding");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = useMemo(() => supabaseBrowser(), []);

  // 🔹 Load videos list
  const loadVideos = useCallback(
    async (type: VideoType) => {
      setLoading(true);
      try {
        const { data: files, error } = await supabase.storage
          .from(BUCKET)
          .list(`videos/${type}`, {
            sortBy: { column: "created_at", order: "desc" },
          });

        if (error) {
          if (error.message?.includes("not found")) {
            setVideos([]);
            return;
          }
          throw error;
        }

        // lấy các file .txt và đọc nội dung (url thật)
        const txtFiles = (files || []).filter((f) => f.name.endsWith(".txt"));

        const videoList: Video[] = [];
        for (const f of txtFiles) {
          const path = `videos/${type}/${f.name}`;
          const { data: content } = await supabase.storage
            .from(BUCKET)
            .download(path);
          let url = "";
          if (content) {
            url = await content.text();
          }
          const id =
            extractYouTubeId(url) ||
            extractVimeoId(url) ||
            f.name.replace(".txt", "");
          videoList.push({
            video_id: id,
            type,
            url,
            path,
            created_at: f.created_at || new Date().toISOString(),
          });
        }

        setVideos(videoList);
      } catch (err: any) {
        toast.error(err?.message || "Lỗi tải danh sách video");
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    loadVideos(activeTab);
  }, [activeTab, loadVideos]);

  // 🔹 Thêm video
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || !videoUrl.trim()) return;

    const trimmed = videoUrl.trim();
    const type = getVideoType(trimmed);
    if (type === "unknown") {
      toast.error("Chỉ hỗ trợ YouTube hoặc Vimeo");
      return;
    }

    setIsSubmitting(true);
    setBusy(true);
    setBusyText("Đang thêm video...");

    try {
      const formData = new FormData();
      formData.append("url", trimmed);
      formData.append("type", activeTab);

      await addVideoAction(formData);
      toast.success("Đã thêm video thành công!");
      setVideoUrl("");
      await loadVideos(activeTab);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi thêm video");
    } finally {
      setIsSubmitting(false);
      setBusy(false);
      setBusyText("");
    }
  };

  // 🔹 Xoá video
  const handleDelete = async (video: Video) => {
    if (deletingPath !== null) return;
    setDeletingPath(video.path);
    setBusy(true);
    setBusyText("Đang xóa video...");

    try {
      await deleteVideoAction(video.path);
      toast.success("Đã xóa video");
      await loadVideos(activeTab);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi xóa video");
    } finally {
      setDeletingPath(null);
      setBusy(false);
      setBusyText("");
    }
  };

  const videoType = useMemo(() => getVideoType(videoUrl), [videoUrl]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      {busy && <FullscreenLoader text={busyText} />}

      <h1 className="text-2xl font-semibold mb-2">Quản lý Video</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Thêm link YouTube hoặc Vimeo để hiển thị video trên website.
      </p>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b">
        {["prewedding", "wedding"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as VideoType)}
            className={`px-4 py-2 font-medium ${
              activeTab === tab
                ? "border-b-2 border-black text-black"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab === "prewedding" ? "Prewedding" : "Wedding"}
          </button>
        ))}
      </div>

      {/* Form thêm video */}
      <section className="mb-8 rounded-lg border bg-white p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="video-url"
              className="block text-sm font-medium mb-2"
            >
              Link Video (YouTube hoặc Vimeo)
            </label>
            <input
              id="video-url"
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... hoặc https://vimeo.com/..."
              className="w-full rounded border px-3 py-2"
              disabled={isSubmitting}
            />
            {videoUrl && (
              <p className="mt-1 text-xs text-green-600">
                ✓{" "}
                {videoType === "youtube"
                  ? "YouTube"
                  : videoType === "vimeo"
                  ? "Vimeo"
                  : "Không hợp lệ"}
              </p>
            )}
          </div>

          {videoUrl && videoType !== "unknown" && (
            <div className="rounded-lg border p-4 bg-neutral-50">
              <p className="text-xs font-medium mb-2 text-neutral-600">
                Preview:
              </p>
              <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden border">
                <iframe
                  src={getEmbedUrl(videoUrl)}
                  title="Preview"
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || videoType === "unknown"}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 hover:bg-neutral-800 transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                Đang thêm...
              </>
            ) : (
              "Thêm video"
            )}
          </button>
        </form>
      </section>

      {/* Danh sách videos */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Danh sách video ({videos.length})
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-neutral-500">
            <p>Chưa có video nào. Hãy thêm video đầu tiên!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => {
              const type = getVideoType(video.url);
              const thumb =
                type === "youtube" && extractYouTubeId(video.url)
                  ? getYouTubeThumbnail(extractYouTubeId(video.url)!, "high")
                  : "https://cdn-icons-png.flaticon.com/512/1384/1384060.png";

              return (
                <div
                  key={video.path}
                  className="group relative rounded-lg border bg-white overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative aspect-video w-full bg-neutral-100">
                    {type === "vimeo" ? (
                      <iframe
                        src={getEmbedUrl(video.url)}
                        className="absolute inset-0 w-full h-full"
                        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                        allowFullScreen
                      />
                    ) : (
                      <img
                        src={thumb}
                        alt={`Video ${video.video_id}`}
                        className="w-full h-full object-cover"
                      />
                    )}

                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-white hover:bg-black/90 transition-colors"
                      >
                        <Play className="h-5 w-5" />
                        <span className="text-sm font-medium">Xem video</span>
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(video)}
                      disabled={deletingPath === video.path}
                      className="absolute top-2 right-2 rounded-full bg-black/70 p-2 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 disabled:opacity-50"
                      title="Xóa video"
                    >
                      {deletingPath === video.path ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="p-3">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900"
                    >
                      <span className="truncate">{video.url}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-xs text-neutral-400 mt-1">
                      {new Date(video.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
