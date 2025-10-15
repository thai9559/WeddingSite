"use server";

import { cookies } from "next/headers";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";

const BUCKET = "wedding";

function sanitizeName(name: string) {
    return (name || "unnamed").replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function uploadBannerAction(formData: FormData) {
    const supabase = createServerActionClient({ cookies });

    const {
        data: { session },
        error: sessionErr,
    } = await supabase.auth.getSession();
    if (sessionErr) throw sessionErr;
    if (!session) throw new Error("Bạn cần đăng nhập.");

    const locationRaw = String(formData.get("location") || "").trim().toLowerCase();
    const deviceRaw = String(formData.get("device") || "").trim().toLowerCase();
    const location = locationRaw || "hero";
    const device: "pc" | "mobile" = deviceRaw === "mobile" ? "mobile" : "pc";

    const files = (formData.getAll("files") as File[]).filter(Boolean);
    if (!files.length) return { ok: true, uploaded: 0, detail: { errors: [] } };

    const attemptPaths: string[] = [];
    const uploadedPublicUrls: string[] = [];
    const errors: { name: string; message: string; path?: string }[] = [];

    for (const file of files) {
        const safeName = sanitizeName(file.name || "image");
        const path = `banners/${location}/${device}/${Date.now()}-${safeName}`;
        attemptPaths.push(path);

        // 1) Upload file vào Storage
        const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, {
                contentType: file.type || "image/jpeg",
                upsert: false,
            });
        if (upErr) {
            errors.push({ name: file.name, message: upErr.message, path });
            continue;
        }

        // 2) Tạo URL để thỏa NOT NULL (public hoặc fallback = path)
        //    - Public bucket: dùng publicUrl.
        //    - Private bucket: tránh lưu signed URL (hết hạn), ta lưu 'path' (không-null)
        //      và UI sẽ tự tạo signed khi render.
        const { data: pu } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const nonNullUrl = pu?.publicUrl || path; // luôn không-null

        // 3) Ghi DB — BỔ SUNG 'url' để tránh lỗi NOT NULL
        const { error: dbErr } = await supabase
            .from("banner_images")
            .insert({ path, location, device, url: nonNullUrl });

        if (dbErr) {
            // rollback file trong Storage để tránh orphan
            const { error: rmErr } = await supabase.storage.from(BUCKET).remove([path]);
            if (rmErr) {
                // vẫn báo lỗi gốc + lỗi remove (nếu có)
                errors.push({
                    name: file.name,
                    path,
                    message: `${dbErr.message} (rollback storage error: ${rmErr.message})`,
                });
            } else {
                errors.push({ name: file.name, path, message: dbErr.message });
            }
            continue;
        }

        uploadedPublicUrls.push(nonNullUrl);
    }

    return {
        ok: errors.length === 0,
        uploaded: uploadedPublicUrls.length,
        attemptPaths,
        detail: { uploaded: uploadedPublicUrls, errors, location, device, bucket: BUCKET },
    };
}
