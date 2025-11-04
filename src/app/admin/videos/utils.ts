// Helper functions để xử lý YouTube URLs

/**
 * Extract YouTube video ID từ nhiều định dạng URL khác nhau
 */
export function extractYouTubeId(url: string): string | null {
    if (!url || typeof url !== "string") return null;

    // Loại bỏ khoảng trắng
    const trimmed = url.trim();

    // Pattern cho các định dạng YouTube URL phổ biến
    const patterns = [
        // https://www.youtube.com/watch?v=VIDEO_ID
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        // https://youtu.be/VIDEO_ID
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        // YouTube short URL
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    // Nếu không match pattern, có thể đã là ID rồi (11 ký tự)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return trimmed;
    }

    return null;
}

/**
 * Validate YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
    return extractYouTubeId(url) !== null;
}

/**
 * Get YouTube thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: "default" | "medium" | "high" | "maxres" = "high"): string {
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
 * Get YouTube watch URL
 */
export function getYouTubeWatchUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
}

