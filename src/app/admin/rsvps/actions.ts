"use server";

import { cookies } from "next/headers";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/app/lib/supabase-admin";

const BUCKET = "wedding";

export async function deleteRSVPAction(id: number, eventKey: string) {
    const supabase = createServerActionClient({ cookies });

    const {
        data: { session },
        error: sessionErr,
    } = await supabase.auth.getSession();
    if (sessionErr) throw new Error(sessionErr.message);
    if (!session) throw new Error("Bạn cần đăng nhập.");

    // Xóa từ database
    const admin = supabaseAdmin();
    const { error: dbError } = await admin
        .from("wedding_rsvps")
        .delete()
        .eq("id", id);

    if (dbError) {
        throw new Error(`Lỗi xóa RSVP: ${dbError.message}`);
    }

    // Xóa folder trong Storage (nếu có)
    const storagePath = `wedding-rsvps/${eventKey}/${id}`;
    try {
        // List tất cả files trong folder
        const { data: files } = await admin.storage
            .from(BUCKET)
            .list(storagePath);

        if (files && files.length > 0) {
            // Xóa tất cả files
            const filePaths = files.map((file) => `${storagePath}/${file.name}`);
            await admin.storage.from(BUCKET).remove(filePaths);
        }
    } catch (storageErr) {
        // Log lỗi nhưng không fail nếu không xóa được storage
        console.error("Error deleting storage files:", storageErr);
    }

    return { ok: true };
}

