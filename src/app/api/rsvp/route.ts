import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0] ??
            req.headers.get("x-real-ip") ??
            undefined;

        const {
            name,
            phone = null,
            guests_count,
            relation_key,
            relation_note = null,
            message = null,
            event_key = "wedding-2025",
        } = body ?? {};

        if (!name || !guests_count || !relation_key) {
            return NextResponse.json({ error: "Thiếu dữ liệu bắt buộc." }, { status: 400 });
        }
        if (relation_key === "other" && !relation_note) {
            return NextResponse.json({ error: "Vui lòng ghi rõ khi chọn 'Khác'." }, { status: 400 });
        }

        const admin = supabaseAdmin();

        // 1) Insert DB
        const { data: row, error } = await admin
            .from("wedding_rsvps")
            .insert({
                event_key,
                name: String(name).trim(),
                phone: phone ? String(phone).trim() : null,
                guests_count: Number(guests_count),
                relation_key,
                relation_note: relation_key === "other" ? String(relation_note).trim() : null,
                message: message ? String(message).trim() : null,
                source_ip: ip || null,
            })
            .select("*")
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        // 2) Upload từng TRƯỜNG dưới dạng file .txt vào Storage (bucket: "wedding")
        const encoder = (s: string) => new Blob([s], { type: "text/plain; charset=utf-8" });

        // nếu dùng chung bucket "wedding", ta để vào folder wedding-rsvps/<event>/<id>/
        const basePath = `wedding-rsvps/${row.event_key}/${row.id}`;

        // helper upload 1 file, dùng upsert để ghi đè nếu cần
        const put = (path: string, content: string | null | undefined) =>
            content != null && content !== ""
                ? admin.storage.from("wedding").upload(path, encoder(content), { upsert: true })
                : Promise.resolve({ data: null, error: null });

        const uploads = await Promise.all([
            put(`${basePath}/name.txt`, row.name),
            put(`${basePath}/phone.txt`, row.phone),
            put(`${basePath}/relation_key.txt`, row.relation_key),
            put(`${basePath}/relation_note.txt`, row.relation_note ?? ""),
            put(`${basePath}/guests_count.txt`, String(row.guests_count)),
            put(`${basePath}/message.txt`, row.message ?? ""),
            put(`${basePath}/created_at.txt`, row.created_at),
        ]);

        // log lỗi nào đó (không fail request chính)
        uploads.forEach(({ error }) => {
            if (error) console.error("Storage upload error:", error);
        });

        return NextResponse.json({ ok: true, row, storage_folder: basePath });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
