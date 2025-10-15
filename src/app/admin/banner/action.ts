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

        const { error: dbErr } = await supabase
            .from("banner_images")
            .insert({ path, location, device });
        if (dbErr) {
            errors.push({ name: file.name, message: dbErr.message, path });
            continue;
        }

        const { data: pu } = supabase.storage.from(BUCKET).getPublicUrl(path);
        if (pu?.publicUrl) uploadedPublicUrls.push(pu.publicUrl);
    }

    return {
        ok: errors.length === 0,
        uploaded: uploadedPublicUrls.length,
        attemptPaths,
        detail: { uploaded: uploadedPublicUrls, errors, location, device, bucket: BUCKET },
    };
}
