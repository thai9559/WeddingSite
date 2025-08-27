'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function uploadBannerAction(formData: FormData) {
    const supabase = createServerActionClient({ cookies });

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        throw new Error("Bạn cần đăng nhập.");
    }

    const userId = session.user.id;
    const location = formData.get("location") as string;
    const device = formData.get("device") as string;
    const files = formData.getAll("files") as File[];

    if (!location) {
        throw new Error("Thiếu vị trí banner.");
    }

    if (!["pc", "mobile"].includes(device)) {
        throw new Error("Thiết bị không hợp lệ.");
    }

    const uploaded: string[] = [];

    for (const file of files) {
        const path = `banners/${location}/${device}/${Date.now()}-${file.name}`;

        const { data, error } = await supabase.storage
            .from("wedding")
            .upload(path, file, { upsert: true });

        if (error || !data?.path) continue;

        const image_url = supabase.storage.from("wedding").getPublicUrl(data.path).data.publicUrl;
        uploaded.push(image_url);

        await supabase.from("banner_images").insert({
            url: image_url,
            device,
            location,
            owner_id: userId,
        });
    }

    return { uploaded: uploaded.length };
}
