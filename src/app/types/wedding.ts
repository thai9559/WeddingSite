export type WeddingImage = { id: number; url: string; caption: string };

export type WeddingAlbumCard = {
    key: string;
    title: string;
    coverUrl: string;
    imageUrls: string[];
    href?: string;
    description?: string; // ✅ thêm
};

export type WeddingData = {
    gallery: WeddingImage[];
    albums: WeddingAlbumCard[];
};

export type WeddingInput = {
    base: string;
    gallery: { id: number; file: string; caption: string }[];
    albums: {
        key: string;
        title: string;
        range: [number, number];
        href?: string;
        description?: string; // ✅ thêm
    }[];
};
