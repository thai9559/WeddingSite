// app/(admin)/banners/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { uploadBannerAction } from "./action";
import { toast } from "sonner";
import { AdminBannerImages } from "@/app/components/AdminBannerImages";
import type { BannerImage } from "@/app/components/AdminBannerImages";
import { fileToWebp } from "@/app/lib/img-webp";

export type BannerLocation = { id: number; key: string; name: string };
type Device = "pc" | "mobile";

const BUCKET = "wedding";
const IS_PRIVATE_BUCKET = false;

/* -------------------- Helper -------------------- */

// Chuẩn hoá string → Device
function asDevice(v: string): Device {
  return v === "mobile" ? "mobile" : "pc";
}

// preset theo device
function getPresetByDevice(device: Device) {
  if (device === "mobile") {
    return {
      maxWidth: 1280,
      maxHeight: 1280,
      targetBytes: 450_000, // ~450KB
      quality: 0.82,
      minQuality: 0.6,
    };
  }
  return {
    maxWidth: 2560,
    maxHeight: 1440,
    targetBytes: 700_000, // ~700KB
    quality: 0.85,
    minQuality: 0.6,
  };
}

async function getPublicUrl(path: string): Promise<string> {
  const supabase = supabaseBrowser(); // ✅ gọi hàm để lấy client
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function getUrlFromPath(path: string): Promise<string> {
  const supabase = supabaseBrowser(); // ✅ gọi hàm để lấy client
  if (!IS_PRIVATE_BUCKET) return getPublicUrl(path);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10); // URL sống 10 phút

  if (error || !data?.signedUrl) {
    console.error("❌ Lỗi tạo signed URL:", error);
    throw error ?? new Error("Không tạo được signed URL");
  }

  return data.signedUrl;
}

// fallback nếu DB cũ lưu full URL thay vì path
function extractPathFromUrl(u: string) {
  const m = u?.match(/\/object\/(public|sign)\/wedding\/(.+)$/);
  return m?.[2] || "";
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Đã xảy ra lỗi không xác định";
  }
}

/* -------------------- Types cho kết quả upload -------------------- */
type UploadDetailError = { name: string; path?: string; message: string };
type UploadResult = {
  uploaded: number;
  attemptPaths?: string[];
  detail?: { errors?: UploadDetailError[] };
};

/* -------------------- Component -------------------- */

export default function AdminUploadBannerPage() {
  const selectedLocation = "hero"; // cố định, tránh no-unused-vars cho setter
  const [device, setDevice] = useState<Device>("pc");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  const [bannerImages, setBannerImages] = useState<BannerImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // load list ảnh theo location + device
  const fetchBannerImages = useCallback(
    async (location: string, dvInput: Device | string) => {
      setLoadingImages(true);
      try {
        const supabase = supabaseBrowser(); // ✅ lấy client
        const dv = asDevice(String(dvInput)); // ✅ normalize về string cho chắc

        const { data, error } = await supabase
          .from("banner_images")
          .select("id, path, url, location, device")
          .eq("location", location)
          .eq("device", dv)
          .order("id", { ascending: true });

        if (error) throw error;

        type Row = {
          id: number;
          path: string | null;
          url: string | null;
          location: string;
          device: string | null;
        };

        const items = (data ?? []) as Row[];

        const resolved = await Promise.all(
          items.map(async (row) => {
            const path = row.path ?? extractPathFromUrl(row.url ?? "");
            if (!path) return null;

            const url = await getUrlFromPath(path);
            const dvNarrow = asDevice(String(row.device ?? ""));

            const item: BannerImage = {
              id: row.id,
              path,
              device: dvNarrow,
              location: row.location,
              url,
            };
            return item;
          })
        );

        setBannerImages(resolved.filter((x): x is BannerImage => x !== null));
      } catch (e: unknown) {
        toast.error("Lỗi khi load ảnh", { description: errorMessage(e) });
        setBannerImages([]);
      } finally {
        setLoadingImages(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedLocation && device) fetchBannerImages(selectedLocation, device);
    else setBannerImages([]);
  }, [selectedLocation, device, result, fetchBannerImages]);

  // xoá 1 ảnh (Storage + DB)
  async function handleDeleteOne(img: BannerImage) {
    setDeletingId(img.id);
    try {
      const supabase = supabaseBrowser(); // ✅ gọi hàm để lấy client

      // Xóa file khỏi Supabase Storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([img.path]);
      if (storageError) throw storageError;

      // Xóa bản ghi trong database
      const { error: dbError } = await supabase
        .from("banner_images")
        .delete()
        .eq("id", img.id);
      if (dbError) throw dbError;

      toast.success("Đã xoá ảnh banner");
      await fetchBannerImages(img.location, img.device);
    } catch (e: unknown) {
      toast.error("Lỗi xoá ảnh", { description: errorMessage(e) });
    } finally {
      setDeletingId(null);
    }
  }

  // khi chọn file: nén/resize sang WebP
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = Array.from(e.target.files ?? []);
    if (!inputFiles.length) {
      setFiles([]);
      return;
    }

    const MAX_INPUT_BYTES = 15 * 1024 * 1024; // 15MB
    const filtered = inputFiles.filter((f) => f.size <= MAX_INPUT_BYTES);
    if (filtered.length < inputFiles.length) {
      toast.info("Một số file > 15MB đã bị bỏ qua để đảm bảo hiệu năng.");
    }

    const preset = getPresetByDevice(device);
    const processed: File[] = [];

    for (const f of filtered) {
      try {
        const webp = await fileToWebp(f, preset);
        processed.push(webp);
      } catch (err: unknown) {
        toast.error(`Không nén được ảnh: ${f.name}`, {
          description: errorMessage(err),
        });
      }
    }

    setFiles(processed);
  };

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Admin · Upload ảnh banner</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Chọn vị trí (location), thiết bị (pc/mobile), rồi upload.
      </p>

      <form
        className="mt-6 space-y-5"
        action={async (formData: FormData) => {
          try {
            setBusy(true);
            if (!selectedLocation)
              throw new Error("Bạn chưa chọn vị trí banner.");

            formData.append("location", selectedLocation);
            formData.append("device", device);
            files.forEach((f) => formData.append("files", f));

            const res = (await uploadBannerAction(formData)) as
              | UploadResult
              | undefined;

            console.group("[UploadBannerAction] Debug");
            console.log("attemptPaths:", res?.attemptPaths);
            console.log("detail:", res?.detail);
            console.groupEnd();

            const errs = res?.detail?.errors ?? [];
            if (errs.length) {
              toast.error("Một số ảnh upload thất bại", {
                description: errs
                  .map(
                    (e) =>
                      `${e.name}${e.path ? ` → ${e.path}` : ""}: ${e.message}`
                  )
                  .join("\n"),
              });
            }

            const uploaded = res?.uploaded ?? 0;
            setResult(`✅ Upload: ${uploaded}/${files.length}
→ Thư mục: banners/${selectedLocation}/${device}
→ Attempt: ${(res?.attemptPaths || []).join(", ")}`);

            setFiles([]);
            toast.success("Đã upload banner", {
              description: `Tải lên ${uploaded} ảnh.`,
            });
          } catch (e: unknown) {
            const msg = errorMessage(e);
            setResult("❌ Lỗi: " + msg);
            toast.error("Upload thất bại", {
              description: msg,
            });
          } finally {
            setBusy(false);
          }
        }}
      >
        {/* Chọn vị trí */}
        {/* Vị trí cố định: hero */}
        <div>
          <label className="text-xs font-medium">Vị trí (location)</label>
          <input
            type="text"
            name="location"
            value="hero"
            readOnly
            className="mt-1 w-full outline-none rounded border disabled p-2 bg-neutral-50 text-neutral-600"
          />
        </div>

        {/* Thiết bị */}
        <div>
          <label className="text-xs font-medium">Thiết bị</label>
          <select
            name="device"
            value={device}
            onChange={(e) => setDevice(asDevice(e.target.value))}
            className="mt-1 w-full rounded border p-2"
            required
          >
            <option value="pc">PC</option>
            <option value="mobile">Mobile</option>
          </select>
        </div>

        {/* Upload */}
        <div>
          <label className="text-xs font-medium">Ảnh banner</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="mt-1 w-full rounded border p-2"
            required
          />
          <div className="mt-2 text-xs text-neutral-500">
            {files.length
              ? `${files.length} ảnh đã chọn (đã nén sang WebP trước khi upload)`
              : "Chưa chọn ảnh"}
          </div>
        </div>

        <button
          disabled={busy}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? "Đang upload…" : "Upload"}
        </button>

        {result && (
          <pre className="rounded border mt-3 p-3 text-xs whitespace-pre-wrap">
            {result}
          </pre>
        )}
      </form>

      {/* List ảnh */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Ảnh đã upload</h2>
        {loadingImages ? (
          <p className="text-sm text-nezutral-500">Đang tải ảnh…</p>
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
