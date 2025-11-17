"use client";
export const dynamic = "force-dynamic";

import type React from "react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { uploadBannerAction, deleteBannerAction } from "./action";
import { toast } from "sonner";
import { AdminBannerImages } from "@/app/components/AdminBannerImages";
import type { BannerImage as UIBannerImage } from "@/app/components/AdminBannerImages";
import { Loader2, X } from "lucide-react";
import { fileToWebp } from "@/app/lib/img-webp";

/* ========= TYPES ========= */
type Device = "pc" | "mobile";
type BannerImage = {
  id: number;
  path: string;
  url: string;
  location: string;
  device: Device;
};
export type BannerLocation = { id: number; key: string; name: string };

/* ========= CONSTS ========= */
const BUCKET = "wedding";
const LOCATIONS: BannerLocation[] = [
  { id: 1, key: "hero", name: "Hero Banner" },
];

/* ========= HELPERS ========= */
function buildPrefix(location: string, device: Device) {
  return `banners/${location}/${device}`;
}

async function getUrl(path: string) {
  const supabase = supabaseBrowser();
  const signed = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 5);

  if (!signed.error && signed.data?.signedUrl) return signed.data.signedUrl;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/* ========= UI HELPERS ========= */
const FullscreenLoader = ({ text }: { text?: string }) => (
  <div className="fixed inset-0 z-[100] grid place-items-center bg-black/30 backdrop-blur-sm">
    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm font-medium">{text ?? "Đang xử lý..."}</span>
    </div>
  </div>
);

const SkeletonCard = () => (
  <div className="aspect-[4/3] w-full animate-pulse rounded border bg-neutral-200/70" />
);

/* ========= PAGE ========= */
export default function Page() {
  const [device, setDevice] = useState<Device>("pc");
  const [location] = useState<BannerLocation>(LOCATIONS[0]);

  const [loadingImages, setLoadingImages] = useState(false);
  const [bannerImages, setBannerImages] = useState<BannerImage[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState(false);

  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<
    { name: string; size: number; url: string }[]
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = useMemo(() => supabaseBrowser(), []);

  /* ========= FETCH IMAGES ========= */
  const fetchFromDB = useCallback(
    async (loc: string, dv: Device): Promise<BannerImage[]> => {
      const { data, error } = await supabase
        .from("banner_images")
        .select("id, path, url, location, device")
        .eq("location", loc)
        .eq("device", dv)
        .order("id", { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as {
        id: number;
        path: string;
        url: string;
        location: string;
        device: Device | null;
      }[];

      return rows.map((r) => ({
        id: r.id,
        path: r.path,
        url: r.url,
        location: r.location,
        device: r.device ?? dv,
      }));
    },
    [supabase]
  );

  const fetchFromStorage = useCallback(
    async (loc: string, dv: Device): Promise<BannerImage[]> => {
      const prefix = buildPrefix(loc, dv);
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(prefix, { limit: 100 });

      if (error) throw error;

      const files = (data ?? []).filter(
        (f) => f.name && !f.name.startsWith(".") && !f.name.endsWith("/")
      );

      return Promise.all(
        files.map(async (f, i) => {
          const path = `${prefix}/${f.name}`;
          return {
            id: -(i + 1),
            path,
            location: loc,
            device: dv,
            url: await getUrl(path),
          };
        })
      );
    },
    [supabase]
  );

  const loadImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      let imgs = await fetchFromDB(location.key, device);
      if (!imgs.length) imgs = await fetchFromStorage(location.key, device);

      setBannerImages(imgs);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoadingImages(false);
    }
  }, [device, location.key, fetchFromDB, fetchFromStorage]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  /* ========= PREVIEW HANDLERS ========= */
  const revokeAllPreviews = useCallback(() => {
    setPreviews((arr) => {
      arr.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      setSelectedFiles(files);
      setFileError(false);

      revokeAllPreviews();
      setPreviews(
        files.map((f) => ({
          name: f.name,
          size: f.size,
          url: URL.createObjectURL(f),
        }))
      );
    },
    [revokeAllPreviews]
  );

  const removePreviewAt = useCallback((i: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });
  }, []);

  const clearAllPreviews = useCallback(() => {
    setSelectedFiles([]);
    revokeAllPreviews();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [revokeAllPreviews]);

  /* ========= UPLOAD ========= */
  const handleUpload = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isUploading) return;

      if (!selectedFiles.length) {
        setFileError(true);
        toast.error("Bạn chưa chọn ảnh");
        return;
      }

      setIsUploading(true);
      setBusy(true);
      setBusyText("Đang chuyển ảnh sang WebP…");

      const opts =
        device === "mobile"
          ? { maxWidth: 1440, maxHeight: 1440, targetBytes: 450_000 }
          : { maxWidth: 2560, maxHeight: 2560, targetBytes: 900_000 };

      const converted = await Promise.all(
        selectedFiles.map((f) =>
          fileToWebp(f, { ...opts, quality: 0.82, minQuality: 0.6 })
        )
      );

      const fd = new FormData();
      fd.set("location", location.key);
      fd.set("device", device);
      converted.forEach((f) => fd.append("files", f, f.name));

      const res = await uploadBannerAction(fd);

      if (!res.ok) toast.error("Upload có lỗi");
      else toast.success(`Đã upload ${res.uploaded} ảnh`);

      await loadImages();
      clearAllPreviews();

      setIsUploading(false);
      setBusy(false);
    },
    [
      selectedFiles,
      device,
      location.key,
      loadImages,
      clearAllPreviews,
      isUploading,
    ]
  );

  /* ========= DELETE (SERVER ACTION) ========= */
  const handleDeleteOne = useCallback(
    async (img: UIBannerImage) => {
      try {
        setDeletingId(img.id);
        setBusy(true);
        setBusyText("Đang xoá ảnh…");

        const res = await deleteBannerAction(img.id, img.path);

        if (!res.ok) {
          toast.error("Xoá thất bại");
        } else {
          toast.success("Đã xoá");
        }

        await loadImages();
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setDeletingId(null);
        setBusy(false);
      }
    },
    [loadImages]
  );

  /* ========= RENDER ========= */
  const totalSize = previews.reduce((s, p) => s + p.size, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      {busy && <FullscreenLoader text={busyText} />}

      <h1 className="text-2xl font-bold">Upload Banner</h1>

      {/* ===== FILTERS ===== */}
      <section className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Location</label>
        <select
          className="rounded border bg-neutral-100 px-3 py-2"
          value={location.key}
          disabled
        >
          <option value="hero">Hero Banner</option>
        </select>

        <label className="ml-4 text-sm font-medium">Thiết bị</label>
        <select
          className="rounded border px-3 py-2"
          value={device}
          onChange={(e) => setDevice(e.target.value as Device)}
        >
          <option value="pc">PC</option>
          <option value="mobile">Mobile</option>
        </select>

        <button
          type="button"
          className="ml-2 inline-flex items-center gap-2 rounded border px-3 py-2"
          onClick={loadImages}
          disabled={loadingImages}
        >
          {loadingImages && <Loader2 className="h-4 w-4 animate-spin" />}
          Reload
        </button>
      </section>

      {/* ===== UPLOAD FORM ===== */}
      <section>
        <form
          onSubmit={handleUpload}
          className="flex flex-col gap-3 rounded border p-4"
        >
          <input
            id="bannerFiles"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            required
            onChange={handleFileChange}
            className={`cursor-pointer ${
              fileError ? "ring-2 ring-red-500" : ""
            }`}
          />

          {previews.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm">
                  Đã chọn {previews.length} ảnh · Tổng{" "}
                  {(totalSize / 1024 / 1024).toFixed(2)}MB
                </p>

                <button
                  type="button"
                  className="text-sm underline"
                  onClick={clearAllPreviews}
                >
                  Xoá tất cả
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {previews.map((p, i) => (
                  <div
                    key={p.url}
                    className="group relative rounded border overflow-hidden"
                  >
                    <div className="relative aspect-[4/3]">
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
                      onClick={() => removePreviewAt(i)}
                      className="absolute right-1 top-1 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading}
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
          >
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isUploading ? "Đang upload…" : "Upload ảnh"}
          </button>
        </form>
      </section>

      {/* ===== IMAGE LIST ===== */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ảnh đã upload</h2>

        {loadingImages ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <AdminBannerImages
            images={bannerImages}
            deletingId={deletingId}
            onDelete={handleDeleteOne}
          />
        )}
      </section>
    </main>
  );
}
