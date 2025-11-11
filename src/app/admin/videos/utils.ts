// Helper functions để xử lý YouTube & Vimeo URLs

/**
 * Extract YouTube video ID từ nhiều định dạng URL khác nhau
 */
export function extractYouTubeId(url: string): string | null {
    if (!url || typeof url !== "string") return null;

    const trimmed = url.trim();

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) return match[1];
    }

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

    return null;
}

/**
 * Extract Vimeo video ID
 */
export function extractVimeoId(url: string): string | null {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
}

/**
 * Detect video type: YouTube, Vimeo, or Unknown
 */
export function getVideoType(
    url: string
): "youtube" | "vimeo" | "unknown" {
    if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
    if (/vimeo\.com/.test(url)) return "vimeo";
    return "unknown";
}

/**
 * Validate YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
    return extractYouTubeId(url) !== null;
}

/**
 * Validate Vimeo URL
 */
export function isValidVimeoUrl(url: string): boolean {
    return extractVimeoId(url) !== null;
}

/**
 * Get YouTube thumbnail URL
 */
export function getYouTubeThumbnail(
    videoId: string,
    quality: "default" | "medium" | "high" | "maxres" = "high"
): string {
    const qualityMap = {
        default: "default",
        medium: "mqdefault",
        high: "hqdefault",
        maxres: "maxresdefault",
    };

    return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Get YouTube embed URL
 */
export function getYouTubeEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Get Vimeo embed URL
 */
export function getVimeoEmbedUrl(videoId: string): string {
    return `https://player.vimeo.com/video/${videoId}`;
}

/**
 * Get YouTube watch URL
 */
export function getYouTubeWatchUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Get generic embed URL (YouTube hoặc Vimeo)
 */
export function getEmbedUrl(url: string): string {
    const type = getVideoType(url);

    if (type === "youtube") {
        const id = extractYouTubeId(url);
        return id ? getYouTubeEmbedUrl(id) : "";
    }

    if (type === "vimeo") {
        const id = extractVimeoId(url);
        return id ? getVimeoEmbedUrl(id) : "";
    }

    return "";
}
