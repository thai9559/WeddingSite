"use server";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "wedding";

/* ============================================================
   SUPABASE ADMIN CLIENT (Service Role)
   ============================================================ */
function supabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // 🔥 phải đúng tên này

    if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
    if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

    return createClient(url, key, {
        auth: { persistSession: false },
    });
}

/* ============================================================
   UPLOAD BANNER
   ============================================================ */
export async function uploadBannerAction(formData: FormData) {
    const admin = supabaseAdmin();

    const location = String(formData.get("location") || "hero");
    const device = String(formData.get("device") || "pc") as "pc" | "mobile";

    const files = formData.getAll("files") as File[];
    if (!files.length)
        return { ok: false, uploaded: 0, detail: { errors: [] } };

    const uploadedUrls: string[] = [];
    const errors: { name: string; message: string; path?: string }[] = [];

    for (const file of files) {
        const safeName = (file.name || "image").replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const path = `banners/${location}/${device}/${Date.now()}-${safeName}`;

        // 1) Upload lên Storage
        const { error: upErr } = await admin.storage
            .from(BUCKET)
            .upload(path, file, {
                contentType: file.type || "image/webp",
                upsert: false,
            });

        if (upErr) {
            errors.push({ name: file.name, message: upErr.message });
            continue;
        }

        // 2) Lấy public URL (hoặc fallback path)
        const { data: pu } = admin.storage.from(BUCKET).getPublicUrl(path);
        const publicUrl = pu?.publicUrl ?? path;

        // 3) Insert DB
        const { error: dbErr } = await admin.from("banner_images").insert({
            path,
            location,
            device,
            url: publicUrl, // tránh NOT NULL error
        });

        if (dbErr) {
            // rollback Storage
            await admin.storage.from(BUCKET).remove([path]);
            errors.push({ name: file.name, message: dbErr.message });
            continue;
        }

        uploadedUrls.push(publicUrl);
    }

    return {
        ok: errors.length === 0,
        uploaded: uploadedUrls.length,
        detail: {
            uploaded: uploadedUrls,
            errors,
            location,
            device,
        },
    };
}

/* ============================================================
   DELETE BANNER (XOÁ STORAGE + DB)
   ============================================================ */
export async function deleteBannerAction(id: number, path: string) {
    const admin = supabaseAdmin();

    // Xóa file trong Storage
    const { error: storageErr } = await admin.storage
        .from(BUCKET)
        .remove([path]);

    // Xóa DB
    const { error: dbErr } = await admin
        .from("banner_images")
        .delete()
        .eq("id", id);

    return {
        ok: !storageErr && !dbErr,
        storageErr,
        dbErr,
    };
}
