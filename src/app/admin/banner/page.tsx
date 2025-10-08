"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { uploadBannerAction } from "../banner/action";
import { toast } from "sonner";
import { AdminBannerImages } from "@/app/components/AdminBannerImages";
import type { BannerImage } from "@/app/components/AdminBannerImages";

export type BannerLocation = {
  id: number;
  key: string;
  name: string;
};

type Device = "pc" | "mobile";

const BUCKET = "wedding";

// Nếu bucket PUBLIC:
function getPublicUrl(path: string) {
  return supabaseBrowser.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Nếu bucket PRIVATE, bật flag này và dùng createSignedUrl thay cho getPublicUrl
const IS_PRIVATE_BUCKET = false; // <-- đổi true nếu bucket Private

async function getUrlFromPath(path: string): Promise<string> {
  if (!IS_PRIVATE_BUCKET) {
    return getPublicUrl(path);
  }
  const { data, error } = await supabaseBrowser.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10); // 10 phút
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Không tạo được signed URL");
  }
  return data.signedUrl;
}

export default function AdminUploadBannerPage() {
  const [locations, setLocations] = useState<BannerLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [device, setDevice] = useState<Device>("pc");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [bannerImages, setBannerImages] = useState<BannerImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabaseBrowser
        .from("banner_locations")
        .select("id, key, name")
        .order("id", { ascending: true });

      if (!error) setLocations((data as BannerLocation[]) || []);
      else console.error("Lỗi khi load banner_locations:", error.message);
    })();
  }, []);

  // thêm helper fallback nếu DB cũ chưa có `path`
  function extractPathFromUrl(u: string) {
    // hỗ trợ cả public/sign
    const m = u?.match(/\/object\/(public|sign)\/wedding\/(.+)$/);
    return m?.[2] || "";
  }

  // 🔄 Lấy ảnh banner (chấp nhận dv là Device hoặc string để tương thích dữ liệu cũ)
  const fetchBannerImages = useCallback(
    async (location: string, dv: Device | string) => {
      setLoadingImages(true);
      try {
        const { data, error } = await supabaseBrowser
          .from("banner_images")
          .select("id, path, url, location, device")
          .eq("location", location)
          .eq("device", dv)
          .order("id");

        if (error) throw error;

        const items = (data ?? []) as Array<{
          id: number;
          path: string | null;
          url: string;
          location: string;
          device: string;
        }>;

        const resolved = await Promise.all(
          items.map(async (row) => {
            const path = row.path || extractPathFromUrl(row.url);
            if (!path) return null;

            const url = await getUrlFromPath(path);

            // Thu hẹp kiểu device về union "pc" | "mobile" nếu hợp lệ, default "pc"
            const dvNarrow: Device = row.device === "mobile" ? "mobile" : "pc";

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

        const images = resolved.filter((x): x is BannerImage => x !== null);
        setBannerImages(images);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error("Lỗi khi load ảnh", { description: msg });
        setBannerImages([]);
      } finally {
        setLoadingImages(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedLocation && device) {
      fetchBannerImages(selectedLocation, device);
    } else {
      setBannerImages([]);
    }
  }, [selectedLocation, device, result, fetchBannerImages]);

  async function handleDeleteOne(img: BannerImage) {
    setDeletingId(img.id);
    try {
      // Xoá bằng path, không split từ url
      const { error: storageError } = await supabaseBrowser.storage
        .from(BUCKET)
        .remove([img.path]);

      if (storageError) throw storageError;

      if (img.id && !Number.isNaN(Number(img.id))) {
        await supabaseBrowser.from("banner_images").delete().eq("id", img.id);
      }

      toast.success("Đã xoá ảnh banner thành công");
      await fetchBannerImages(img.location, img.device);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Lỗi xoá ảnh", { description: msg });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Admin · Upload ảnh banner</h1>
      <p className="text-sm text-neutral-500 mt-1">
        Chọn vị trí banner, thiết bị (pc/mobile) và ảnh rồi upload.
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

            const res = await uploadBannerAction(formData);
            setResult(`✅ Đã upload ${res.uploaded} ảnh banner.`);
            setFiles([]);

            toast.success("Đã upload banner", {
              description: `Tải lên ${res.uploaded} ảnh banner.`,
            });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setResult("❌ Lỗi: " + msg);
            toast.error("Upload thất bại", { description: msg });
          } finally {
            setBusy(false);
          }
        }}
      >
        {/* Vị trí */}
        <div>
          <label className="text-xs font-medium">Vị trí banner</label>
          <select
            name="location"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            required
          >
            <option value="">-- Chọn vị trí banner --</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.key}>
                {loc.name} ({loc.key})
              </option>
            ))}
          </select>
        </div>

        {/* Thiết bị */}
        <div>
          <label className="text-xs font-medium">Loại thiết bị</label>
          <select
            name="device"
            value={device}
            onChange={(e) => setDevice(e.target.value as Device)}
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
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="mt-1 w-full rounded border p-2"
            required
          />
          <div className="mt-2 text-xs text-neutral-500">
            {files.length ? `${files.length} ảnh đã chọn` : "Chưa chọn ảnh"}
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

      {/* List ảnh */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Ảnh đã upload</h2>
        {loadingImages ? (
          <p className="text-sm text-neutral-500">Đang tải ảnh…</p>
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
