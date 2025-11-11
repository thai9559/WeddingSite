"use server";

import { cookies } from "next/headers";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import {
    extractYouTubeId,
    extractVimeoId,
    getVideoType,
} from "./utils";

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

    if (!url) throw new Error("Vui lòng nhập link video.");

    if (type !== "prewedding" && type !== "wedding") {
        throw new Error("Loại video không hợp lệ.");
    }

    // ✅ Nhận diện loại video
    const videoType = getVideoType(url);
    if (videoType === "unknown") {
        throw new Error("Chỉ hỗ trợ YouTube hoặc Vimeo.");
    }

    // ✅ Lấy videoId tương ứng
    let videoId: string | null = null;
    if (videoType === "youtube") videoId = extractYouTubeId(url);
    else if (videoType === "vimeo") videoId = extractVimeoId(url);

    if (!videoId) {
        throw new Error("Không thể xác định ID video. Kiểm tra lại link.");
    }

    // ✅ Kiểm tra trùng file
    const filePath = `videos/${type}/${videoId}.txt`;
    const { data: existing } = await supabase.storage
        .from(BUCKET)
        .list(`videos/${type}`, {
            search: `${videoId}.txt`,
        });

    if (existing && existing.length > 0) {
        throw new Error("Video này đã tồn tại trong danh sách.");
    }

    // ✅ Tạo file text chứa URL thật (cả Vimeo hoặc YouTube)
    const blob = new Blob([url], { type: "text/plain; charset=utf-8" });
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
