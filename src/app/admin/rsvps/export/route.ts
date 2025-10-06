import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";

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

    const rows = data ?? [];
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

function q(v: any) {
    const s = v == null ? "" : String(v);
    // escape CSV
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}
