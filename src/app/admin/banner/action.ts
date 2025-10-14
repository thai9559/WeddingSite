// app/(admin)/banners/action.ts
"use server";

import { cookies } from "next/headers";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
// import type { Database } from "@/types/supabase";

const BUCKET = "wedding";

export async function uploadBannerAction(formData: FormData) {
    const supabase = createServerActionClient/*<Database>*/({ cookies });

    const {
        data: { session },
        error: sessionErr,
    } = await supabase.auth.getSession();
    if (sessionErr) throw new Error(sessionErr.message);
    if (!session) throw new Error("Bạn cần đăng nhập.");
    const userId = session.user.id;

    const location = String(formData.get("location") || "").trim();
    const device = String(formData.get("device") || "").trim().toLowerCase();
    const files = formData.getAll("files") as File[];
    if (!location) throw new Error("Thiếu vị trí banner.");
    if (!["pc", "mobile"].includes(device)) throw new Error("Thiết bị không hợp lệ.");
    if (!files.length) throw new Error("Chưa chọn file.");

    // (Optional) xác nhận location có tồn tại trong banner_locations
    const { data: loc, error: locErr } = await supabase
        .from("banner_locations")
        .select("key")
        .eq("key", location)
        .maybeSingle();
    if (locErr) throw locErr;
    if (!loc?.key) throw new Error("Vị trí banner không hợp lệ.");

    // Chuẩn prefix như albums (ổn định với Hero)
    const base = `banners/${location}/${device}`;

    const uploaded: string[] = [];
    const errors: { name: string; message: string; path?: string }[] = [];
    const attemptPaths: string[] = [];

    for (const file of files) {
        const origName = file.name || "unnamed";
        const isWebp = file.type === "image/webp" || /\.webp$/i.test(origName);

        // Lấy extension hợp lệ
        const ext = isWebp
            ? "webp"
            : (origName.split(".").pop() || "").toLowerCase() || "jpg";

        // Base name an toàn
        const baseName = origName.replace(/\.[^.]+$/, "");
        const safeBase = baseName.replace(/[^\w.-]+/g, "_");
        const ts = Date.now();
        const safeName = `${ts}-${safeBase}.${ext}`;

        const path = `${base}/${safeName}`;
        attemptPaths.push(path);

        // contentType ưu tiên từ file.type, fallback theo ext
        const contentType =
            isWebp
                ? "image/webp"
                : file.type || (ext === "png" ? "image/png" : "image/jpeg");

        const { data, error } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, {
                upsert: true,
                cacheControl: "3600",
                contentType,
            });

        if (error || !data?.path) {
            errors.push({
                name: origName,
                message: error?.message || "Upload lỗi",
                path,
            });
            continue;
        }

        const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;

        // Insert DB để Admin list
        const { error: dbErr } = await supabase.from("banner_images").insert({
            path: data.path,     // ví dụ: banners/hero/pc/xxxx.webp
            // url: publicUrl,    // có thể lưu hoặc bỏ, Hero có thể build từ path
            device,
            location,
            owner_id: userId,
        });
        if (dbErr) {
            errors.push({ name: origName, message: dbErr.message, path: data.path });
            // (tuỳ chọn) rollback storage nếu muốn
            continue;
        }

        uploaded.push(publicUrl);
    }

    return {
        ok: errors.length === 0,
        uploaded: uploaded.length,
        attemptPaths,
        detail: { uploaded, errors, location, device, bucket: BUCKET, base },
    };
}
