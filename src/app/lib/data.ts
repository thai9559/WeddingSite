import { supabaseAdmin } from './supabase-admin';

export async function getBanners() {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
        .from('banners')
        .select('id, image_url, heading, subheading, sort')
        .eq('location', 'hero')
        .eq('is_active', true)
        .order('sort', { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function getAlbums() {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
        .from('albums')
        .select('id, key, title, description, cover_url, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function getImagesByAlbumKey(key: string) {
    const supabase = supabaseAdmin();

    // lấy album để map id
    const { data: album, error: aErr } = await supabase
        .from('albums')
        .select('id')
        .eq('key', key)
        .single();
    if (aErr) throw aErr;
    if (!album) return [];

    const { data, error } = await supabase
        .from('images')
        .select('id, url, caption, sort, created_at')
        .eq('album_id', album.id)
        .order('sort', { ascending: true })
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
}
