// app/(admin)/banners/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { uploadBannerAction } from "./action";
import { toast } from "sonner";
import { AdminBannerImages } from "@/app/components/AdminBannerImages";
import type { BannerImage } from "@/app/components/AdminBannerImages";

export type BannerLocation = { id: number; key: string; name: string };
type Device = "pc" | "mobile";

const BUCKET = "wedding";
const IS_PRIVATE_BUCKET = false;

function getPublicUrl(path: string) {
  return supabaseBrowser.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
async function getUrlFromPath(path: string) {
  if (!IS_PRIVATE_BUCKET) return getPublicUrl(path);
  const { data, error } = await supabaseBrowser.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error || !data?.signedUrl)
    throw error ?? new Error("Không tạo được signed URL");
  return data.signedUrl;
}

// fallback nếu DB cũ lưu full URL thay vì path
function extractPathFromUrl(u: string) {
  const m = u?.match(/\/object\/(public|sign)\/wedding\/(.+)$/);
  return m?.[2] || "";
}

export default function AdminUploadBannerPage() {
  const [locations, setLocations] = useState<BannerLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [device, setDevice] = useState<Device>("pc");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  const [bannerImages, setBannerImages] = useState<BannerImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // load vị trí
  useEffect(() => {
    (async () => {
      const { data, error } = await supabaseBrowser
        .from("banner_locations")
        .select("id, key, name")
        .order("id", { ascending: true });
      if (!error) setLocations((data as BannerLocation[]) || []);
      else console.error("Lỗi load banner_locations:", error.message);
    })();
  }, []);

  // load list ảnh theo location + device
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
          url: string | null;
          location: string;
          device: string;
        }>;

        const resolved = await Promise.all(
          items.map(async (row) => {
            const path = row.path || extractPathFromUrl(row.url || "");
            if (!path) return null;
            const url = await getUrlFromPath(path);
            const dvNarrow: Device =
              row.device?.toLowerCase() === "mobile" ? "mobile" : "pc";
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

        setBannerImages(resolved.filter(Boolean) as BannerImage[]);
      } catch (e: any) {
        toast.error("Lỗi khi load ảnh", {
          description: e?.message || String(e),
        });
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
      const { error: storageError } = await supabaseBrowser.storage
        .from(BUCKET)
        .remove([img.path]);
      if (storageError) throw storageError;
      await supabaseBrowser.from("banner_images").delete().eq("id", img.id);
      toast.success("Đã xoá ảnh banner");
      await fetchBannerImages(img.location, img.device);
    } catch (e: any) {
      toast.error("Lỗi xoá ảnh", { description: e?.message || String(e) });
    } finally {
      setDeletingId(null);
    }
  }

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

            const res = await uploadBannerAction(formData);

            // debug giống albums
            console.group("[UploadBannerAction] Debug");
            console.log("attemptPaths:", res?.attemptPaths);
            console.log("detail:", res?.detail);
            console.groupEnd();

            if (res?.detail?.errors?.length) {
              toast.error("Một số ảnh upload thất bại", {
                description: res.detail.errors
                  .map(
                    (e: any) =>
                      `${e.name}${e.path ? ` → ${e.path}` : ""}: ${e.message}`
                  )
                  .join("\n"),
              });
            }

            setResult(`✅ Upload: ${res.uploaded}/${files.length}
→ Thư mục: banners/${selectedLocation}/${device}
→ Attempt: ${(res.attemptPaths || []).join(", ")}`);

            setFiles([]);
            toast.success("Đã upload banner", {
              description: `Tải lên ${res.uploaded} ảnh.`,
            });
          } catch (e: any) {
            setResult("❌ Lỗi: " + (e?.message || String(e)));
            toast.error("Upload thất bại", {
              description: e?.message || String(e),
            });
          } finally {
            setBusy(false);
          }
        }}
      >
        {/* Chọn vị trí */}
        <div>
          <label className="text-xs font-medium">Vị trí (location)</label>
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
          <label className="text-xs font-medium">Thiết bị</label>
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
          <pre className="rounded border mt-3 p-3 text-xs whitespace-pre-wrap">
            {result}
          </pre>
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
