"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const BUCKET = "wedding";

/* ============================================================
   SUPABASE CLIENTS
   ============================================================ */

// Auth client (dùng session user)
function supabaseAuth() {
    return createServerActionClient({ cookies: () => cookies() });
}

// Admin client (dùng service role key)
function supabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
    if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

    return createClient(url, key, {
        auth: { persistSession: false },
    });
}

/* ============================================================
   HELPERS
   ============================================================ */
function inferExt(file: File): string {
    const name = file.name.toLowerCase();
    if (file.type === "image/webp" || name.endsWith(".webp")) return "webp";
    if (file.type === "image/png" || name.endsWith(".png")) return "png";
    if (file.type === "image/gif" || name.endsWith(".gif")) return "gif";
    return "jpg";
}

function inferContentType(ext: string): string {
    switch (ext) {
        case "webp": return "image/webp";
        case "png": return "image/png";
        case "gif": return "image/gif";
        default: return "image/jpeg";
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
    const supabase = supabaseAuth();
    const admin = supabaseAdmin();

    // Session
    const {
        data: { session },
        error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr) throw new Error(sessionErr.message);
    if (!session) throw new Error("Bạn cần đăng nhập.");

    const userId = session.user.id;

    const albumId = parseInt(String(formData.get("albumId")), 10);
    if (!albumId) throw new Error("Sai album ID");

    const files = formData.getAll("files") as File[];
    const cover = formData.get("cover") as File | null;

    // Lấy album key
    const { data: album, error: albumErr } = await admin
        .from("albums")
        .select("key")
        .eq("id", albumId)
        .single();

    if (albumErr || !album?.key) throw new Error("Không tìm thấy album");
    const albumKey = album.key;

    const uploaded: string[] = [];
    const errors: any[] = [];

    /* Upload COVER */
    if (cover) {
        const ext = inferExt(cover);
        const path = `cover/${Date.now()}-${safeBaseName(cover.name)}.${ext}`;

        const { data, error } = await admin.storage
            .from(BUCKET)
            .upload(path, cover, {
                contentType: inferContentType(ext),
                upsert: true,
            });

        if (error) {
            errors.push(error);
        } else {
            const coverUrl = admin.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
            await admin.from("albums").update({ cover_url: coverUrl }).eq("id", albumId);
        }
    }

    /* Upload album images */
    for (const file of files) {
        const ext = inferExt(file);
        const path = `albums/${albumKey}/${Date.now()}-${safeBaseName(file.name)}.${ext}`;

        const { data, error } = await admin.storage
            .from(BUCKET)
            .upload(path, file, {
                contentType: inferContentType(ext),
                upsert: true,
            });

        if (error) {
            errors.push(error);
            continue;
        }

        const url = admin.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;

        await admin.from("images").insert({
            album_id: albumId,
            owner_id: userId,
            url,
        });

        uploaded.push(url);
    }

    return { ok: errors.length === 0, uploaded, errors };
}

/* ============================================================
   DELETE ACTION
   ============================================================ */
export async function deleteAlbumImageAction(imageId: number, imageUrl: string) {
    const supabase = supabaseAuth();
    const admin = supabaseAdmin();

    // Check session
    const {
        data: { session },
        error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr) throw new Error(sessionErr.message);
    if (!session) throw new Error("Bạn cần đăng nhập.");

    // Extract path
    const marker = `/object/public/${BUCKET}/`;
    const i = imageUrl.indexOf(marker);
    if (i === -1) throw new Error("Không trích được path từ URL");

    const path = decodeURIComponent(imageUrl.slice(i + marker.length).split("?")[0]);

    // Delete storage
    const { error: sErr } = await admin.storage.from(BUCKET).remove([path]);
    if (sErr && !sErr.message.toLowerCase().includes("not found")) {
        throw new Error("Lỗi xoá file: " + sErr.message);
    }

    // Delete DB
    const { error: dbErr } = await admin.from("images")
        .delete()
        .eq("id", imageId);

    if (dbErr) throw new Error("Lỗi xoá DB: " + dbErr.message);

    return { ok: true };
}
