"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { uploadBannerAction } from "./action";
import { toast } from "sonner";
import { AdminBannerImages } from "@/app/components/AdminBannerImages";
import type { BannerImage as UIBannerImage } from "@/app/components/AdminBannerImages";

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

const LOCATIONS: BannerLocation[] = [
  { id: 1, key: "hero", name: "Hero Banner" },
  { id: 2, key: "moment", name: "Moment" },
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

/* ========= PAGE ========= */
export default function Page() {
  const [device, setDevice] = useState<Device>("pc");
  const [location, setLocation] = useState<BannerLocation>(LOCATIONS[0]);
  const [loadingImages, setLoadingImages] = useState<boolean>(false);
  const [bannerImages, setBannerImages] = useState<BannerImage[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const supabase = useMemo(() => supabaseBrowser(), []);

  const fetchFromDB = useCallback(
    async (loc: string, dv: Device): Promise<BannerImage[]> => {
      const { data, error } = await supabase
        .from("banner_images")
        .select("id, path, location, device")
        .eq("location", loc)
        .eq("device", dv)
        .not("path", "is", null) // new
        .neq("path", "") // new
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
        (f) => !!f.name && !f.name.endsWith("/")
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

  const loadImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      let imgs = await fetchFromDB(location.key, device);
      if (!imgs.length) imgs = await fetchFromStorage(location.key, device);
      setBannerImages(imgs);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Lỗi tải ảnh");
    } finally {
      setLoadingImages(false);
    }
  }, [device, location.key, fetchFromDB, fetchFromStorage]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleUpload = useCallback(
    async (ev: React.FormEvent<HTMLFormElement>) => {
      ev.preventDefault();
      const fd = new FormData(ev.currentTarget);
      fd.set("location", location.key);
      fd.set("device", device);

      const res = await uploadBannerAction(fd);
      if (!res.ok) {
        toast.error("Upload có lỗi", {
          description: JSON.stringify(res.detail?.errors || [], null, 2),
        });
      } else {
        toast.success(`Đã upload ${res.uploaded} ảnh`);
      }
      await loadImages();
      ev.currentTarget.reset();
    },
    [device, location.key, loadImages]
  );

  const handleDeleteOne = useCallback(
    async (img: UIBannerImage) => {
      try {
        setDeletingId(img.id);

        // helper nhỏ để nhận diện lỗi 404 từ Supabase Storage
        const is404 = (err: unknown): boolean =>
          typeof err === "object" &&
          err !== null &&
          "statusCode" in (err as any) &&
          (err as any).statusCode === 404;

        // 1) Xoá file trên Storage (nếu có path). Bỏ qua lỗi 404.
        let storageErr: any = null;
        if (img.path) {
          const { error } = await supabase.storage
            .from(BUCKET)
            .remove([img.path]);
          if (error && !is404(error)) {
            storageErr = error; // ghi nhận lỗi khác 404, vẫn tiếp tục xoá DB
          }
        }

        // 2) Xoá bản ghi DB nếu là record thật (id > 0)
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
      }
    },
    [supabase, loadImages]
  );

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <h1 className="text-2xl font-bold">Upload Banner</h1>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Location</label>
        <select
          className="rounded border px-3 py-2"
          value={location.key}
          onChange={(e) => {
            const next =
              LOCATIONS.find((x) => x.key === e.target.value) || LOCATIONS[0];
            setLocation(next);
          }}
        >
          {LOCATIONS.map((it) => (
            <option key={it.id} value={it.key}>
              {it.name}
            </option>
          ))}
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
          className="ml-2 rounded border px-3 py-2"
          onClick={loadImages}
        >
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
          <input type="hidden" name="device" value={device} />
          <input
            name="files"
            type="file"
            accept="image/*"
            multiple
            className="cursor-pointer"
          />
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-white hover:opacity-90"
          >
            Upload ảnh
          </button>
        </form>
      </section>

      {/* List */}
      <section className="space-y-3">
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
