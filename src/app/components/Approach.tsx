"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import {
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
  getYouTubeWatchUrl,
} from "@/app/admin/videos/utils";
import { Play } from "lucide-react";

type VideoType = "prewedding" | "wedding";

type Video = {
  video_id: string;
  type: VideoType;
  url: string;
};

const BUCKET = "wedding";

export function Approach() {
  const [activeTab, setActiveTab] = useState<VideoType>("prewedding");
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  // ✅ Chỉ khởi tạo Supabase sau khi client mount
  const supabaseRef = useRef<ReturnType<typeof supabaseBrowser> | null>(null);

  const loadVideos = useCallback(async (type: VideoType) => {
    if (!supabaseRef.current) return;
    setLoading(true);
    try {
      const { data: files, error } = await supabaseRef.current.storage
        .from(BUCKET)
        .list(`videos/${type}`, {
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) {
        if (
          error.message?.includes("not found") ||
          error.message?.includes("404") ||
          error.message?.includes("does not exist")
        ) {
          setVideos([]);
          return;
        }
        console.error("Error loading videos:", error);
        setVideos([]);
        return;
      }

      const txtFiles = (files || []).filter(
        (f) => f.name.endsWith(".txt") && !f.name.startsWith(".")
      );

      const videosList: Video[] = txtFiles.map((file) => {
        const videoId = file.name.replace(/\.txt$/, "");
        return {
          video_id: videoId,
          type,
          url: getYouTubeWatchUrl(videoId),
        };
      });

      setVideos(videosList);
      setSelectedVideoIndex(videosList.length > 0 ? 0 : null);
    } catch (err) {
      console.error("Error loading videos:", err);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Khởi tạo Supabase chỉ sau khi window có (client)
  useEffect(() => {
    if (typeof window === "undefined") return;
    supabaseRef.current = supabaseBrowser();
  }, []);

  // ✅ Gọi loadVideos khi tab đổi và supabase đã sẵn sàng
  useEffect(() => {
    if (!supabaseRef.current) return;
    loadVideos(activeTab);
  }, [activeTab, loadVideos]);

  const selectedVideo = useMemo(() => {
    if (selectedVideoIndex === null || !videos[selectedVideoIndex]) return null;
    return videos[selectedVideoIndex];
  }, [videos, selectedVideoIndex]);

  return (
    <section className="relative mt-20 overflow-hidden select-none">
      <h2
        className="text-center text-5xl font-extrabold tracking-wide text-gray-700 mb-8"
        style={{ fontFamily: '"Ms Madi", cursive' }}
      >
        Video
      </h2>

      {/* Tabs */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => setActiveTab("prewedding")}
          className={`px-6 py-3 font-medium transition-all duration-300 rounded-full ${
            activeTab === "prewedding"
              ? "bg-gradient-to-r from-pink-100 to-rose-100 text-rose-700 shadow-md scale-105"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
          }`}
          style={{ fontFamily: '"Ms Madi", cursive', fontSize: "1.25rem" }}
        >
          Prewedding
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("wedding")}
          className={`px-6 py-3 font-medium transition-all duration-300 rounded-full ${
            activeTab === "wedding"
              ? "bg-gradient-to-r from-pink-100 to-rose-100 text-rose-700 shadow-md scale-105"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
          }`}
          style={{ fontFamily: '"Ms Madi", cursive', fontSize: "1.25rem" }}
        >
          Wedding
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-400"></div>
        </div>
      )}

      {/* Empty state */}
      {!loading && videos.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">
            Chưa có video nào trong phần{" "}
            {activeTab === "prewedding" ? "Prewedding" : "Wedding"}
          </p>
        </div>
      )}

      {/* Video content */}
      {!loading && videos.length > 0 && (
        <div className="max-w-6xl mx-auto px-4">
          {/* Main video player */}
          {selectedVideo && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-rose-50 to-pink-50 p-4">
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black">
                <iframe
                  src={getYouTubeEmbedUrl(selectedVideo.video_id)}
                  title={selectedVideo.video_id}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Video {selectedVideoIndex! + 1} / {videos.length}
                </p>
              </div>
            </div>
          )}

          {/* Video grid */}
          {videos.length > 1 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">
                Xem thêm video khác
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {videos.map((video, index) => (
                  <button
                    key={video.video_id}
                    type="button"
                    onClick={() => setSelectedVideoIndex(index)}
                    className={`group relative aspect-video rounded-lg overflow-hidden transition-all duration-300 ${
                      selectedVideoIndex === index
                        ? "ring-4 ring-rose-400 scale-105 shadow-lg"
                        : "hover:scale-105 hover:shadow-xl"
                    }`}
                  >
                    <img
                      src={getYouTubeThumbnail(video.video_id, "high")}
                      alt={`Video ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="rounded-full bg-white/90 p-3">
                        <Play className="h-6 w-6 text-rose-600 fill-rose-600" />
                      </div>
                    </div>
                    {selectedVideoIndex === index && (
                      <div className="absolute top-2 right-2 bg-rose-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        Đang phát
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation arrows */}
          {videos.length > 1 && (
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() =>
                  setSelectedVideoIndex((prev) =>
                    prev !== null && prev > 0 ? prev - 1 : videos.length - 1
                  )
                }
                className="px-6 py-3 bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 rounded-full font-medium hover:from-rose-200 hover:to-pink-200 transition-all shadow-md hover:shadow-lg"
              >
                ← Video trước
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedVideoIndex((prev) =>
                    prev !== null && prev < videos.length - 1 ? prev + 1 : 0
                  )
                }
                className="px-6 py-3 bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 rounded-full font-medium hover:from-rose-200 hover:to-pink-200 transition-all shadow-md hover:shadow-lg"
              >
                Video tiếp →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Decorative elements */}
      <div className="absolute -z-10 top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-100 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-rose-100 rounded-full blur-2xl opacity-30 animate-pulse delay-300" />
      </div>
    </section>
  );
}
