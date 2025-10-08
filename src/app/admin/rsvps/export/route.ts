import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";

type RelationKey =
    | "bride_friend"
    | "groom_friend"
    | "coworker"
    | "family"
    | "other";

type RsvpRow = {
    id: string | number;
    event_key: string;
    name: string;
    phone?: string | null;
    guests_count: number;
    relation_key: RelationKey | string; // dữ liệu cũ có thể là string tự do
    relation_note?: string | null;
    message?: string | null;
    source_ip?: string | null;
    created_at: string; // ISO
};

export async function GET(req: Request) {
    const url = new URL(req.url);
    const event = url.searchParams.get("event") || "wedding-2025";

    const admin = supabaseAdmin();
    const { data, error } = await admin
        .from("wedding_rsvps")
        .select("*")
        .eq("event_key", event)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const rows = (data ?? []) as RsvpRow[];

    const header = [
        "id",
        "event_key",
        "name",
        "phone",
        "guests_count",
        "relation_key",
        "relation_note",
        "message",
        "source_ip",
        "created_at",
    ];

    const csv =
        [header.join(",")]
            .concat(
                rows.map((r) =>
                    [
                        r.id,
                        q(r.event_key),
                        q(r.name),
                        q(r.phone),
                        r.guests_count,
                        q(r.relation_key),
                        q(r.relation_note),
                        q(r.message),
                        q(r.source_ip),
                        q(r.created_at),
                    ].join(",")
                )
            )
            .join("\n");

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="rsvps-${event}.csv"`,
        },
    });
}

/** Quote + escape giá trị CSV an toàn, không dùng any */
function q(v: unknown): string {
    if (v === null || v === undefined) return "";
    const s = String(v);
    // escape CSV: nếu có " , hoặc xuống dòng thì quote + escape
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}
