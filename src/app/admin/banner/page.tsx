"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabase-browser";
import { uploadBannerAction } from "../banner/action";

type BannerLocation = {
  id: number;
  key: string; // e.g. "hero", "moment"
  name: string; // e.g. "Hero banner"
};

export default function AdminUploadBannerPage() {
  const [locations, setLocations] = useState<BannerLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [device, setDevice] = useState("pc");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  // 🔄 Load từ bảng banner_locations
  useEffect(() => {
    (async () => {
      const { data, error } = await supabaseBrowser
        .from("banner_locations")
        .select("id, key, name")
        .order("id", { ascending: true });

      if (error) {
        console.error("Lỗi khi load banner_locations:", error.message);
        return;
      }

      setLocations(data || []);
    })();
  }, []);

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
            setSelectedLocation("");
          } catch (e: any) {
            setResult("❌ Lỗi: " + e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {/* Dropdown chọn location */}
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

        {/* Chọn thiết bị */}
        <div>
          <label className="text-xs font-medium">Loại thiết bị</label>
          <select
            name="device"
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            required
          >
            <option value="pc">PC</option>
            <option value="mobile">Mobile</option>
          </select>
        </div>

        {/* Chọn ảnh */}
        <div>
          <label className="text-xs font-medium">Ảnh banner</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="mt-1 w-full rounded border p-2"
            required
          />
          <div className="mt-2 text-xs text-neutral-500">
            {files.length ? `${files.length} ảnh đã chọn` : "Chưa chọn ảnh"}
          </div>
        </div>

        {/* Nút upload */}
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
    </main>
  );
}
