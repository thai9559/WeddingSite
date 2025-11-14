"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const BUCKET = "wedding";

/* ============================================================
   Helpers
   ============================================================ */
function inferExt(file: File): string {
    const name = file.name || "";
    const lower = name.toLowerCase();
    if (file.type === "image/webp" || lower.endsWith(".webp")) return "webp";
    if (file.type === "image/png" || lower.endsWith(".png")) return "png";
    if (file.type === "image/jpeg" || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
    if (file.type === "image/gif" || lower.endsWith(".gif")) return "gif";
    return "jpg";
}

function inferContentType(ext: string, fallback?: string): string {
    switch (ext) {
        case "webp": return "image/webp";
        case "png": return "image/png";
        case "gif": return "image/gif";
        default: return fallback || "image/jpeg";
    }
}

function safeBaseName(name: string): string {
    const base = name.replace(/\.[^.]+$/, "");
    return base.replace(/[^\w.-]+/g, "_");
}

/* ============================================================
   UPLOAD ACTION
   ============================================================ */
export async function uploadAlbumAction(formData: FormData) {
    const supabase = createServerActionClient({ cookies });

    const {
        data: { session },
        error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr) throw new Error(sessionErr.message);
    if (!session) throw new Error("Bạn cần đăng nhập.");

    const userId = session.user.id;

    const albumId = parseInt(String(formData.get("albumId") || ""), 10);
    if (!albumId || Number.isNaN(albumId)) throw new Error("Sai album ID.");

    const files = formData.getAll("files") as File[];
    const cover = formData.get("cover") as File | null;

    const uploaded: string[] = [];
    const errors: any[] = [];

    // Lấy album key
    const { data: album, error: albumErr } = await supabase
        .from("albums")
        .select("key")
        .eq("id", albumId)
        .single();

    if (albumErr || !album?.key) throw new Error("Không tìm thấy album.");
    const albumKey = album.key;

    /* ==================== COVER ==================== */
    if (cover) {
        const ext = inferExt(cover);
        const safeName = `${Date.now()}-${safeBaseName(cover.name)}.${ext}`;
        const path = `cover/${safeName}`;

        const { data, error } = await supabase.storage
            .from(BUCKET)
            .upload(path, cover, {
                contentType: inferContentType(ext, cover.type),
                upsert: true,
            });

        if (error || !data) errors.push(error);
        else {
            const coverUrl = supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
            await supabase.from("albums").update({ cover_url: coverUrl }).eq("id", albumId);
        }
    }

    /* ==================== ALBUM IMAGES ==================== */
    for (const file of files) {
        const ext = inferExt(file);
        const safeName = `${Date.now()}-${safeBaseName(file.name)}.${ext}`;
        const path = `albums/${albumKey}/${safeName}`;

        const { data, error } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, {
                contentType: inferContentType(ext, file.type),
                upsert: true,
            });

        if (error || !data) {
            errors.push(error);
            continue;
        }

        const url = supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;

        await supabase.from("images").insert({
            album_id: albumId,
            owner_id: userId,
            url,
        });

        uploaded.push(url);
    }

    return { ok: errors.length === 0, uploaded, errors };
}

/* ============================================================
   DELETE ACTION (Storage + DB)
   ============================================================ */
export async function deleteAlbumImageAction(imageId: number, imageUrl: string) {
    const supabase = createServerActionClient({ cookies });

    const {
        data: { session },
        error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr) throw new Error(sessionErr.message);
    if (!session) throw new Error("Bạn cần đăng nhập.");

    const marker = `/object/public/${BUCKET}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) throw new Error("Không trích được path từ URL");

    const path = decodeURIComponent(imageUrl.slice(idx + marker.length).split("?")[0]);

    // XÓA STORAGE
    const { error: sErr } = await supabase.storage.from(BUCKET).remove([path]);
    if (sErr) {
        const msg = sErr.message?.toLowerCase() || "";
        const is404 =
            msg.includes("no such file") ||
            msg.includes("not found") ||
            msg.includes("object not found");

        if (!is404) {
            throw new Error("Lỗi xoá file: " + sErr.message);
        }
    }


    // XÓA DB ROW
    const { error: dbErr } = await supabase.from("images").delete().eq("id", imageId);
    if (dbErr) throw new Error("Lỗi xoá DB: " + dbErr.message);

    return { ok: true };
}
