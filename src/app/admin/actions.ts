'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function uploadAlbumAction(formData: FormData) {
    const supabase = createServerActionClient({ cookies });

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        throw new Error("Bạn cần đăng nhập.");
    }

    const userId = session.user.id;

    const albumId = parseInt(formData.get("albumId") as string);
    if (!albumId || isNaN(albumId)) {
        throw new Error("Thiếu hoặc sai album ID.");
    }

    const cover = formData.get("cover") as File | null;
    const files = formData.getAll("files") as File[];

    const uploaded: string[] = [];

    // 🔍 Lấy album key theo albumId
    const { data: album, error: albumFetchError } = await supabase
        .from("albums")
        .select("key")
        .eq("id", albumId)
        .single();

    if (albumFetchError || !album?.key) {
        throw new Error("Không tìm thấy album hoặc không có quyền.");
    }

    const albumKey = album.key;

    // ✅ Upload ảnh cover nếu có
    if (cover) {
        const { data, error } = await supabase.storage
            .from("wedding")
            .upload(`cover/${Date.now()}-${cover.name}`, cover, { upsert: true });

        if (!error && data?.path) {
            const coverUrl = supabase.storage.from("wedding").getPublicUrl(data.path).data.publicUrl;
            await supabase
                .from("albums")
                .update({ cover_url: coverUrl })
                .eq("id", albumId)
                .eq("owner_id", userId);
        }
    }

    // ✅ Upload các ảnh còn lại vào đúng thư mục theo albumKey
    for (const file of files) {
        const path = `albums/${albumKey}/${Date.now()}-${file.name}`;

        const { data, error } = await supabase.storage
            .from("wedding")
            .upload(path, file, { upsert: true });

        if (error || !data?.path) continue;

        const url = supabase.storage.from("wedding").getPublicUrl(data.path).data.publicUrl;
        uploaded.push(url);

        await supabase.from("images").insert({
            album_id: albumId,
            url,
            owner_id: userId,
        });
    }

    return { albumId, uploaded };
}
