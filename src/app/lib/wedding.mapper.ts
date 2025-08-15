import { WeddingData, WeddingInput } from "@/app/types/wedding";

export function makeWeddingData(input: WeddingInput): WeddingData {
    const toUrl = (file: string) =>
        input.base.endsWith("/") ? `${input.base}${file}` : `${input.base}/${file}`;

    const gallery = input.gallery.map((g) => ({
        id: g.id,
        url: toUrl(g.file),
        caption: g.caption,
    }));

    const albums = input.albums.map((a) => {
        const [start, end] = a.range;
        const imageUrls = Array.from({ length: end - start + 1 }, (_, i) =>
            toUrl(`${start + i}.jpg`)
        );
        return {
            key: a.key,
            title: a.title,
            href: a.href,
            description: a.description, // ✅ giữ nguyên mô tả từ input
            imageUrls,
            coverUrl: imageUrls[0],
        };
    });

    return { gallery, albums };
}
