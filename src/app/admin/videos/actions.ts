"use server";

import { cookies } from "next/headers";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { extractYouTubeId } from "./utils";

export type VideoType = "prewedding" | "wedding";

const BUCKET = "wedding";

export async function addVideoAction(formData: FormData) {
    const supabase = createServerActionClient({ cookies });

    const {
        data: { session },
        error: sessionErr,
    } = await supabase.auth.getSession();
    if (sessionErr) throw new Error(sessionErr.message);
    if (!session) throw new Error("Bạn cần đăng nhập.");

    const url = String(formData.get("url") || "").trim();
    const type = String(formData.get("type") || "").trim() as VideoType;

    if (!url) {
        throw new Error("Vui lòng nhập link YouTube.");
    }

    if (type !== "prewedding" && type !== "wedding") {
        throw new Error("Loại video không hợp lệ.");
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
        throw new Error("Link YouTube không hợp lệ. Vui lòng kiểm tra lại.");
    }

    // Kiểm tra xem file đã tồn tại chưa trong Storage
    const filePath = `videos/${type}/${videoId}.txt`;
    const { data: existing } = await supabase.storage
        .from(BUCKET)
        .list(`videos/${type}`, {
            search: `${videoId}.txt`,
        });

    if (existing && existing.length > 0) {
        throw new Error("Video này đã tồn tại trong danh sách.");
    }

    // Tạo file text chứa link YouTube
    const fileContent = url;
    const blob = new Blob([fileContent], { type: "text/plain; charset=utf-8" });

    // Upload file vào Storage
    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, blob, {
            contentType: "text/plain; charset=utf-8",
            upsert: false,
        });

    if (uploadError) {
        throw new Error(`Lỗi thêm video: ${uploadError.message}`);
    }

    return { ok: true, videoId, path: filePath };
}

export async function deleteVideoAction(path: string) {
    const supabase = createServerActionClient({ cookies });

    const {
        data: { session },
        error: sessionErr,
    } = await supabase.auth.getSession();
    if (sessionErr) throw new Error(sessionErr.message);
    if (!session) throw new Error("Bạn cần đăng nhập.");

    const { error } = await supabase.storage.from(BUCKET).remove([path]);

    if (error) {
        throw new Error(`Lỗi xóa video: ${error.message}`);
    }

    return { ok: true };
}
