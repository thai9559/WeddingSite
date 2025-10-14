// src/app/lib/img-webp.ts
export type WebpOptions = {
    maxWidth?: number;           // giới hạn chiều rộng
    maxHeight?: number;          // giới hạn chiều cao
    quality?: number;            // 0..1 (mặc định 0.82)
    minQuality?: number;         // 0..1 (mặc định 0.6)
    targetBytes?: number;        // mục tiêu dung lượng (bytes), ví dụ 500_000 (~500KB)
    mime?: "image/webp";         // luôn webp
    debug?: boolean;             // log debug
};

const isImage = (file: File) => /^image\//i.test(file.type);

/**
 * Đọc file -> HTMLImageElement (hoặc ImageBitmap nếu muốn)
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.decoding = "async";
        // tránh CORS canvas tainted khi ảnh là local file input
        img.crossOrigin = "anonymous";
        const url = URL.createObjectURL(file);
        img.src = url;
    });
}

/**
 * Vẽ ảnh lên canvas với giới hạn maxWidth/maxHeight (giữ tỉ lệ)
 */
function drawToCanvas(img: HTMLImageElement, maxW?: number, maxH?: number): HTMLCanvasElement {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    if (!maxW && !maxH) {
        const c = document.createElement("canvas");
        c.width = iw;
        c.height = ih;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        return c;
    }

    const ratio = iw / ih;
    let w = iw;
    let h = ih;

    if (maxW && w > maxW) {
        w = maxW;
        h = Math.round(w / ratio);
    }
    if (maxH && h > maxH) {
        h = maxH;
        w = Math.round(h * ratio);
    }

    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    return c;
}

/**
 * Chuyển canvas -> Blob WebP với quality
 */
function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
            "image/webp",
            quality
        );
    });
}

/**
 * Nén file ảnh sang WebP, scale và lặp hạ quality để đạt targetBytes
 * Trả về File(.webp) đã tối ưu.
 */
export async function fileToWebp(
    file: File,
    opts: WebpOptions = {}
): Promise<File> {
    if (!isImage(file)) return file;

    const {
        maxWidth,
        maxHeight,
        quality = 0.82,
        minQuality = 0.6,
        targetBytes,                 // vd: 450_000 cho mobile, 700_000 cho PC
        mime = "image/webp",
        debug = false,
    } = opts;

    const img = await loadImageFromFile(file);
    const canvas = drawToCanvas(img, maxWidth, maxHeight);

    // Nếu file gốc đã nhỏ hơn targetBytes đáng kể và là webp, có thể giữ nguyên
    if (targetBytes && file.type === "image/webp" && file.size <= targetBytes) {
        return file;
    }

    let q = quality;
    let blob = await canvasToWebpBlob(canvas, q);

    if (targetBytes) {
        // giảm quality từng nấc khi còn lớn hơn targetBytes
        while (blob.size > targetBytes && q > minQuality) {
            q = Math.max(minQuality, +(q - 0.05).toFixed(2));
            blob = await canvasToWebpBlob(canvas, q);
            if (debug) console.log(`[webp] retry quality=${q} size=${blob.size}`);
            if (q === minQuality) break;
        }
    }

    const nameNoExt = file.name.replace(/\.[^.]+$/, ""); // bỏ đuôi cũ
    const webpName = `${nameNoExt}.webp`;

    return new File([blob], webpName, { type: mime, lastModified: Date.now() });
}
