// app/(admin)/albums/actions.ts
"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const BUCKET = "wedding";

function inferExt(file: File): string {
    const name = file.name || "";
    const lower = name.toLowerCase();
    if (file.type === "image/webp" || lower.endsWith(".webp")) return "webp";
    if (file.type === "image/png" || lower.endsWith(".png")) return "png";
    if (file.type === "image/jpeg" || file.type === "image/jpg" || lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
        return "jpg";
    if (file.type === "image/gif" || lower.endsWith(".gif")) return "gif";
    // fallback
    return "jpg";
}

function inferContentType(ext: string, fallback?: string): string {
    switch (ext) {
        case "webp":
            return "image/webp";
        case "png":
            return "image/png";
        case "gif":
            return "image/gif";
        case "jpg":
        case "jpeg":
        default:
            return fallback || "image/jpeg";
    }
}

function safeBaseName(name: string): string {
    const base = name.replace(/\.[^.]+$/, ""); // bỏ phần mở rộng cũ
    return base.replace(/[^\w.-]+/g, "_");     // chỉ giữ chữ/số/_/./-
}

export async function uploadAlbumAction(formData: FormData) {
    const supabase = createServerActionClient({ cookies });

    // Bắt buộc đăng nhập
    const {
        data: { session },
        error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr) throw new Error(sessionErr.message);
    if (!session) throw new Error("Bạn cần đăng nhập.");

    const userId = session.user.id;

    const albumId = parseInt(String(formData.get("albumId") || ""), 10);
    if (!albumId || Number.isNaN(albumId)) {
        throw new Error("Thiếu hoặc sai album ID.");
    }

    const cover = formData.get("cover") as File | null;
    const files = formData.getAll("files") as File[];

    const uploaded: string[] = [];
    const errors: { name: string; message: string; path?: string }[] = [];

    // Lấy album key theo albumId
    const { data: album, error: albumFetchError } = await supabase
        .from("albums")
        .select("key")
        .eq("id", albumId)
        .single();

    if (albumFetchError || !album?.key) {
        throw new Error("Không tìm thấy album hoặc không có quyền.");
    }

    const albumKey = album.key;

    // ✅ Upload ảnh cover (nếu có) — chấp nhận WebP
    if (cover) {
        const ext = inferExt(cover);
        const ts = Date.now();
        const base = safeBaseName(cover.name || "cover");
        const safeName = `${ts}-${base}.${ext}`;
        const path = `cover/${safeName}`;

        const { data, error } = await supabase.storage.from(BUCKET).upload(path, cover, {
            upsert: true,
            cacheControl: "3600",
            contentType: inferContentType(ext, cover.type),
        });

        if (error || !data?.path) {
            errors.push({ name: cover.name, message: error?.message || "Upload cover lỗi", path });
        } else {
            const coverUrl = supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
            const { error: upErr } = await supabase
                .from("albums")
                .update({ cover_url: coverUrl })
                .eq("id", albumId)
                .eq("owner_id", userId);

            if (upErr) {
                errors.push({ name: cover.name, message: upErr.message, path: data.path });
            }
        }
    }

    // ✅ Upload các ảnh còn lại vào đúng thư mục theo albumKey — chấp nhận WebP
    for (const file of files) {
        const ext = inferExt(file);
        const ts = Date.now();
        const base = safeBaseName(file.name || "image");
        const safeName = `${ts}-${base}.${ext}`;
        const path = `albums/${albumKey}/${safeName}`;

        const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
            upsert: true,
            cacheControl: "3600",
            contentType: inferContentType(ext, file.type),
        });

        if (error || !data?.path) {
            errors.push({ name: file.name, message: error?.message || "Upload lỗi", path });
            continue;
        }

        const url = supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
        uploaded.push(url);

        const { error: dbErr } = await supabase.from("images").insert({
            album_id: albumId,
            url,
            owner_id: userId,
        });

        if (dbErr) {
            errors.push({ name: file.name, message: dbErr.message, path: data.path });
            // (tuỳ chọn) rollback storage nếu muốn
        }
    }

    return {
        albumId,
        uploaded,
        ok: errors.length === 0,
        errors,
    };
}
