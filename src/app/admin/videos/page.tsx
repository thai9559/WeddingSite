"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { addVideoAction, deleteVideoAction, type VideoType } from "./actions";
import {
  extractYouTubeId,
  getYouTubeThumbnail,
  getYouTubeWatchUrl,
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
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = useMemo(() => supabaseBrowser(), []);

  const loadVideos = useCallback(
    async (type: VideoType) => {
      setLoading(true);
      try {
        // List files trong folder videos/{type}/
        const { data: files, error } = await supabase.storage
          .from(BUCKET)
          .list(`videos/${type}`, {
            sortBy: { column: "created_at", order: "desc" },
          });

        if (error) {
          // Nếu folder chưa tồn tại, trả về mảng rỗng
          if (
            error.message?.includes("not found") ||
            error.message?.includes("404") ||
            error.message?.includes("does not exist")
          ) {
            setVideos([]);
            return;
          }
          throw error;
        }

        // Lọc chỉ lấy file .txt
        const txtFiles = (files || []).filter(
          (f) => f.name.endsWith(".txt") && !f.name.startsWith(".")
        );

        // Parse video_id từ tên file (ví dụ: "dQw4w9WgXcQ.txt" -> "dQw4w9WgXcQ")
        const videosList: Video[] = txtFiles.map((file) => {
          const videoId = file.name.replace(/\.txt$/, "");
          const path = `videos/${type}/${file.name}`;
          return {
            video_id: videoId,
            type,
            url: getYouTubeWatchUrl(videoId),
            path,
            created_at: file.created_at || new Date().toISOString(),
          };
        });

        setVideos(videosList);
      } catch (err: unknown) {
        let message = "Lỗi tải danh sách video";

        if (err instanceof Error && err.message) {
          message = err.message;
        } else if (typeof err === "object" && err !== null) {
          const supabaseError = err as {
            message?: string;
            code?: string;
            details?: string;
          };
          if (supabaseError.message) {
            message = supabaseError.message;
          } else if (supabaseError.code) {
            message = `Lỗi ${supabaseError.code}: ${
              supabaseError.details || "Không có thông tin chi tiết"
            }`;
          }
        }

        toast.error(message, {
          duration: 5000,
        });

        console.error("Error loading videos:", {
          error: err,
          type,
          errorString: JSON.stringify(err, null, 2),
        });
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    loadVideos(activeTab);
  }, [activeTab, loadVideos]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || !youtubeUrl.trim()) return;

    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      toast.error("Link YouTube không hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }

    setIsSubmitting(true);
    setBusy(true);
    setBusyText("Đang thêm video...");

    try {
      const formData = new FormData();
      formData.append("url", youtubeUrl.trim());
      formData.append("type", activeTab);

      await addVideoAction(formData);
      toast.success("Đã thêm video thành công!");
      setYoutubeUrl("");
      await loadVideos(activeTab);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Lỗi thêm video";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      setBusy(false);
      setBusyText("");
    }
  };

  const handleDelete = async (video: Video) => {
    if (deletingPath !== null) return;

    setDeletingPath(video.path);
    setBusy(true);
    setBusyText("Đang xóa video...");

    try {
      await deleteVideoAction(video.path);
      toast.success("Đã xóa video");
      await loadVideos(activeTab);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Lỗi xóa video";
      toast.error(message);
    } finally {
      setDeletingPath(null);
      setBusy(false);
      setBusyText("");
    }
  };

  const previewVideoId = useMemo(() => {
    if (!youtubeUrl.trim()) return null;
    return extractYouTubeId(youtubeUrl);
  }, [youtubeUrl]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      {busy && <FullscreenLoader text={busyText} />}

      <h1 className="text-2xl font-semibold mb-2">Quản lý Video</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Thêm link YouTube để hiển thị video trên website. Hỗ trợ các định dạng:
        youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...
      </p>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("prewedding")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "prewedding"
              ? "border-b-2 border-black text-black"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Prewedding
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("wedding")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "wedding"
              ? "border-b-2 border-black text-black"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Wedding
        </button>
      </div>

      {/* Form thêm video */}
      <section className="mb-8 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Thêm video mới</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="youtube-url"
              className="block text-sm font-medium mb-2"
            >
              Link YouTube
            </label>
            <input
              id="youtube-url"
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded border px-3 py-2"
              disabled={isSubmitting}
            />
            {previewVideoId && (
              <p className="mt-1 text-xs text-green-600">✓ Link hợp lệ</p>
            )}
          </div>

          {/* Preview thumbnail */}
          {previewVideoId && (
            <div className="rounded-lg border p-4 bg-neutral-50">
              <p className="text-xs font-medium mb-2 text-neutral-600">
                Preview:
              </p>
              <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden border">
                <img
                  src={getYouTubeThumbnail(previewVideoId, "high")}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Play className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !previewVideoId}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors"
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
            {videos.map((video) => (
              <div
                key={video.path}
                className="group relative rounded-lg border bg-white overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full bg-neutral-100">
                  <img
                    src={getYouTubeThumbnail(video.video_id, "high")}
                    alt={`Video ${video.video_id}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-white hover:bg-black/90 transition-colors"
                    >
                      <Play className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Xem trên YouTube
                      </span>
                    </a>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(video)}
                    disabled={deletingPath === video.path}
                    className="absolute top-2 right-2 rounded-full bg-black/70 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                    title="Xóa video"
                  >
                    {deletingPath === video.path ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
                    >
                      <span className="truncate">
                        Video ID: {video.video_id}
                      </span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    {new Date(video.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
