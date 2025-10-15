"use client";
export const dynamic = "force-dynamic";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { uploadBannerAction } from "./action";
import { toast } from "sonner";
import { AdminBannerImages } from "@/app/components/AdminBannerImages";
import type { BannerImage as UIBannerImage } from "@/app/components/AdminBannerImages";
import { Loader2, X } from "lucide-react";
import { fileToWebp } from "@/app/lib/img-webp";

/* ========= TYPES ========= */
type Device = "pc" | "mobile";
type BannerImageRow = {
  id: number;
  path: string;
  location: string;
  device: Device;
};
type BannerImage = BannerImageRow & { url: string };
export type BannerLocation = { id: number; key: string; name: string };

/* ========= CONSTS ========= */
const BUCKET = "wedding";
const RESERVED_NAMES = new Set([
  ".emptyfolderplaceholder",
  ".ds_store",
  "thumbs.db",
]);
const LOCATIONS: BannerLocation[] = [
  { id: 1, key: "hero", name: "Hero Banner" },
];

/* ========= HELPERS ========= */
function buildPrefix(location: string, device: Device) {
  return `banners/${location}/${device}`;
}

/** Ưu tiên signed URL để "bẻ" cache; fallback public URL kèm cache-buster. */
async function getUrl(path: string) {
  const supabase = supabaseBrowser();
  const signed = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 5);
  if (!signed.error && signed.data?.signedUrl) return signed.data.signedUrl;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

/* ========= SMALL UI ========= */
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

  // overlay
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState<string>("");

  // preview state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<
    { name: string; size: number; url: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = useMemo(() => supabaseBrowser(), []);

  const fetchFromDB = useCallback(
    async (loc: string, dv: Device): Promise<BannerImage[]> => {
      const { data, error } = await supabase
        .from("banner_images")
        .select("id, path, location, device")
        .eq("location", loc)
        .eq("device", dv)
        .not("path", "is", null)
        .neq("path", "")
        .not("path", "like", "%/.%")
        .order("id", { ascending: false });
      if (error) throw error;

      const rows: BannerImageRow[] = (data ?? []).map((r: any) => ({
        id: r.id,
        path: r.path,
        location: r.location,
        device: (r.device as Device) || dv,
      }));

      const mapped: BannerImage[] = await Promise.all(
        rows.map(async (r) => ({ ...r, url: await getUrl(r.path) }))
      );
      return mapped;
    },
    [supabase]
  );

  const fetchFromStorage = useCallback(
    async (loc: string, dv: Device): Promise<BannerImage[]> => {
      const prefix = buildPrefix(loc, dv);
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(prefix, { limit: 100, sortBy: { column: "name", order: "asc" } });
      if (error) throw error;

      const files = (data ?? []).filter(
        (f) =>
          !!f.name &&
          !f.name.endsWith("/") &&
          !f.name.startsWith(".") &&
          !RESERVED_NAMES.has(f.name.toLowerCase())
      );

      const mapped: BannerImage[] = await Promise.all(
        files.map(async (f, idx) => {
          const path = `${prefix}/${f.name}`;
          return {
            id: -(idx + 1),
            path,
            location: loc,
            device: dv,
            url: await getUrl(path),
          };
        })
      );
      return mapped;
    },
    [supabase]
  );

  /** Kiểm tra object còn tồn tại không bằng cách thử ký URL ngắn hạn. */
  const fileExists = async (path: string, supa = supabaseBrowser()) => {
    const { data, error } = await supa.storage
      .from(BUCKET)
      .createSignedUrl(path, 60);
    return !!data?.signedUrl && !error;
  };

  /** Lọc row mồ côi (DB có nhưng file đã xoá); đồng thời xoá luôn row DB. */
  const pruneMissingFromDB = async (
    rows: BannerImage[],
    supa = supabaseBrowser()
  ) => {
    const checks = await Promise.all(
      rows.map(async (r) => ({
        r,
        ok: await fileExists(r.path, supa).catch(() => false),
      }))
    );
    const toKeep = checks.filter((c) => c.ok).map((c) => c.r);
    const toDeleteIds = checks
      .filter((c) => !c.ok && c.r.id > 0)
      .map((c) => c.r.id);
    if (toDeleteIds.length)
      await supa.from("banner_images").delete().in("id", toDeleteIds);
    return toKeep;
  };

  const loadImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      let imgs = await fetchFromDB(location.key, device);
      if (imgs.length) imgs = await pruneMissingFromDB(imgs, supabase);
      if (!imgs.length) imgs = await fetchFromStorage(location.key, device);
      setBannerImages(imgs);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Lỗi tải ảnh");
    } finally {
      setLoadingImages(false);
    }
  }, [device, location.key, fetchFromDB, fetchFromStorage, supabase]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  /* ======= PREVIEW HANDLERS ======= */
  const revokeAllPreviews = useCallback(() => {
    setPreviews((arr) => {
      arr.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter(
        (f) => f && f.size > 0 && f.type.startsWith("image/")
      );
      setSelectedFiles(files);
      setFileError(false);

      // clear old urls then create new
      revokeAllPreviews();
      const urls = files.map((f) => ({
        name: f.name,
        size: f.size,
        url: URL.createObjectURL(f),
      }));
      setPreviews(urls);
    },
    [revokeAllPreviews]
  );

  const removePreviewAt = useCallback((idx: number) => {
    setSelectedFiles((prev) => {
      const arr = [...prev];
      arr.splice(idx, 1);
      return arr;
    });
    setPreviews((prev) => {
      const arr = [...prev];
      const removed = arr.splice(idx, 1)[0];
      if (removed) URL.revokeObjectURL(removed.url);
      return arr;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const clearAllPreviews = useCallback(() => {
    setSelectedFiles([]);
    revokeAllPreviews();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [revokeAllPreviews]);

  /* ======= SUBMIT ======= */
  const handleUpload = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isUploading) return;

      if (selectedFiles.length === 0) {
        setFileError(true);
        toast.error("Chưa chọn ảnh", {
          description: "Hãy chọn ít nhất một ảnh trước khi upload.",
        });
        fileInputRef.current?.focus();
        fileInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return;
      }

      setIsUploading(true);
      setBusy(true);
      setBusyText("Đang chuyển ảnh sang WebP…");

      // tuỳ thiết bị → cấu hình nén
      const webpOpts = {
        maxWidth: device === "mobile" ? 1440 : 2560,
        maxHeight: device === "mobile" ? 1440 : 2560,
        targetBytes: device === "mobile" ? 450_000 : 900_000,
        quality: 0.82,
        minQuality: 0.6,
      } as const;

      try {
        // Convert toàn bộ sang webp
        const converted = await Promise.all(
          selectedFiles.map((f) => fileToWebp(f, webpOpts))
        );

        const fd = new FormData();
        fd.set("location", location.key);
        fd.set("device", device);
        converted.forEach((f) => fd.append("files", f, f.name));

        const res = await uploadBannerAction(fd);

        if (!res.ok) {
          toast.error("Upload có lỗi", {
            description: JSON.stringify(res.detail?.errors || [], null, 2),
          });
        } else {
          toast.success(`Đã upload ${res.uploaded} ảnh (WebP)`);
        }

        await loadImages();
        clearAllPreviews();
        setFileError(false);
      } finally {
        setIsUploading(false);
        setBusy(false);
        setBusyText("");
      }
    },
    [
      device,
      location.key,
      selectedFiles,
      loadImages,
      isUploading,
      clearAllPreviews,
    ]
  );

  /* ======= DELETE ======= */
  const handleDeleteOne = useCallback(
    async (img: UIBannerImage) => {
      try {
        setDeletingId(img.id);
        setBusy(true);
        setBusyText("Đang xoá ảnh…");

        const is404 = (err: unknown): boolean =>
          typeof err === "object" &&
          err !== null &&
          "statusCode" in (err as any) &&
          (err as any).statusCode === 404;

        let storageErr: any = null;
        if (img.path) {
          const { error } = await supabase.storage
            .from(BUCKET)
            .remove([img.path]);
          if (error && !is404(error)) storageErr = error;
        }

        let dbErr: any = null;
        if (img.id > 0) {
          const { error } = await supabase
            .from("banner_images")
            .delete()
            .eq("id", img.id);
          if (error) dbErr = error;
        }

        if (storageErr || dbErr) {
          toast.error("Một phần xoá bị lỗi", {
            description: JSON.stringify(
              { storage: storageErr?.message, db: dbErr?.message },
              null,
              2
            ),
          });
        } else {
          toast.success("Đã xoá");
        }

        await loadImages();
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Xoá thất bại");
      } finally {
        setDeletingId(null);
        setBusy(false);
        setBusyText("");
      }
    },
    [supabase, loadImages]
  );

  // cleanup object URLs khi unmount
  useEffect(() => () => revokeAllPreviews(), [revokeAllPreviews]);

  const totalSize = previews.reduce((s, p) => s + p.size, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      {busy && <FullscreenLoader text={busyText} />}

      <h1 className="text-2xl font-bold">Upload Banner</h1>

      {/* Filters */}
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
          className="ml-2 inline-flex items-center gap-2 rounded border px-3 py-2 disabled:opacity-50"
          onClick={loadImages}
          disabled={loadingImages}
        >
          {loadingImages && <Loader2 className="h-4 w-4 animate-spin" />}
          Reload
        </button>
      </section>

      {/* Upload form */}
      <section>
        <form
          onSubmit={handleUpload}
          className="flex flex-col gap-3 rounded border p-4"
        >
          <input type="hidden" name="location" value={location.key} />
          <input
            id="bannerFiles"
            ref={fileInputRef}
            name="files"
            type="file"
            accept="image/*"
            multiple
            required
            onChange={handleFileChange}
            className={`cursor-pointer ${
              fileError ? "ring-2 ring-red-500" : ""
            }`}
          />

          {/* Preview block */}
          {previews.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-600">
                  Đã chọn <b>{previews.length}</b> ảnh · tổng ~
                  {(totalSize / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  className="text-sm underline hover:opacity-80"
                  onClick={clearAllPreviews}
                >
                  Xoá tất cả
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {previews.map((p, i) => (
                  <div
                    key={`${p.name}-${i}`}
                    className="group relative overflow-hidden rounded-lg border bg-white"
                  >
                    {/* Dùng <img> để tránh domain config */}
                    <img
                      src={p.url}
                      alt={p.name}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePreviewAt(i)}
                      className="absolute right-1 top-1 inline-flex items-center rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      title="Bỏ ảnh này khỏi danh sách"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1 text-[10px] text-white">
                      {p.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading}
            className="inline-flex items-center justify-center gap-2 rounded bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
          >
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isUploading ? "Đang upload…" : "Upload ảnh"}
          </button>
        </form>
      </section>

      {/* List */}
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
            onDelete={handleDeleteOne}
            deletingId={deletingId}
          />
        )}
      </section>
    </main>
  );
}
