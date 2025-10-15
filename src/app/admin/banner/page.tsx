"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { uploadBannerAction } from "./action";
import { toast } from "sonner";
import { AdminBannerImages } from "@/app/components/AdminBannerImages";
import type { BannerImage as UIBannerImage } from "@/app/components/AdminBannerImages";
import { Loader2 } from "lucide-react";
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
const IS_PRIVATE_BUCKET = false;
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
async function getUrl(path: string) {
  const supabase = supabaseBrowser();
  if (!IS_PRIVATE_BUCKET) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
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
  <div className="aspect-[4/3] w-full rounded border bg-neutral-200/70 animate-pulse" />
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

  const fileExists = async (
    path: string,
    supabaseClient = supabaseBrowser()
  ) => {
    const { data, error } = await supabaseClient.storage
      .from(BUCKET)
      .createSignedUrl(path, 60);
    return !!data?.signedUrl && !error;
  };
  const pruneMissingFromDB = async (
    rows: BannerImage[],
    supabaseClient = supabaseBrowser()
  ) => {
    const checks = await Promise.all(
      rows.map(async (r) => ({
        r,
        ok: await fileExists(r.path, supabaseClient).catch(() => false),
      }))
    );
    const toKeep = checks.filter((c) => c.ok).map((c) => c.r);
    const toDeleteIds = checks
      .filter((c) => !c.ok && c.r.id > 0)
      .map((c) => c.r.id);
    if (toDeleteIds.length)
      await supabaseClient.from("banner_images").delete().in("id", toDeleteIds);
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

  const handleUpload = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isUploading) return;

      const form = e.currentTarget;
      const fd = new FormData(form);
      const files = (fd.getAll("files") as File[]).filter(
        (f) => f instanceof File && f.size > 0
      );

      if (files.length === 0) {
        setFileError(true);
        toast.error("Chưa chọn ảnh", {
          description: "Hãy chọn ít nhất một ảnh trước khi upload.",
        });
        const input = form.querySelector(
          'input[name="files"]'
        ) as HTMLInputElement | null;
        input?.focus();
        input?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      setIsUploading(true);
      setBusy(true);
      setBusyText("Đang chuyển ảnh sang WebP…");

      // Tham số nén: khác nhau cho PC vs Mobile
      const webpOpts = {
        maxWidth: device === "mobile" ? 1440 : 2560,
        maxHeight: device === "mobile" ? 1440 : 2560,
        targetBytes: device === "mobile" ? 450_000 : 900_000, // ~450KB mobile, ~900KB PC
        quality: 0.82,
        minQuality: 0.6,
      } as const;

      // Chuyển tất cả file đã chọn sang WebP
      const converted = await Promise.all(
        files.map((f) => fileToWebp(f, webpOpts))
      );

      // Tạo FormData mới chỉ chứa file WebP (và metadata cũ)
      const fd2 = new FormData();
      fd2.set("location", location.key);
      fd2.set("device", device);
      converted.forEach((f) => fd2.append("files", f, f.name));

      // Gọi server action với fd2 (thay vì fd cũ)
      const res = await uploadBannerAction(fd2);

      if (!res.ok) {
        toast.error("Upload có lỗi", {
          description: JSON.stringify(res.detail?.errors || [], null, 2),
        });
      } else {
        toast.success(`Đã upload ${res.uploaded} ảnh (định dạng WebP)`);
      }

      await loadImages();
      form.reset();
      setFileError(false);
      setIsUploading(false);
      setBusy(false);
      setBusyText("");
      return;
    },
    [device, location.key, loadImages, isUploading]
  );

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

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      {busy && <FullscreenLoader text={busyText} />}

      <h1 className="text-2xl font-bold">Upload Banner</h1>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Location</label>
        <select
          className="rounded border px-3 py-2 bg-neutral-100"
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
            name="files"
            type="file"
            accept="image/*"
            multiple
            required
            onChange={() => setFileError(false)}
            className={`cursor-pointer ${
              fileError ? "ring-2 ring-red-500" : ""
            }`}
          />
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
