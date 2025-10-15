import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/app/lib/supabase-admin";

export const runtime = "nodejs"; // đảm bảo không chạy Edge (xlsx cần Node)
export const revalidate = 0;
export const dynamic = "force-dynamic";

type RelationKey = "bride_friend" | "groom_friend" | "coworker" | "family" | "other";

type RsvpRow = {
    id: string | number;
    event_key: string;
    name: string;
    phone?: string | null;
    guests_count: number;
    relation_key: RelationKey | string;
    relation_note?: string | null;
    message?: string | null;
    source_ip?: string | null;
    created_at: string; // ISO
};

const RELATION_LABELS: Record<string, string> = {
    bride_friend: "Bạn cô dâu",
    groom_friend: "Bạn chú rể",
    coworker: "Đồng nghiệp",
    family: "Họ hàng",
    other: "Khác",
};

function relationLabel(k: string) {
    return RELATION_LABELS[k] ?? "Khác";
}

function formatVN(iso: string) {
    try {
        return new Date(iso).toLocaleString("vi-VN", {
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
}

/** Escape CSV + chống CSV injection (Excel) */
function safeCsv(v: unknown): string {
    if (v === null || v === undefined) return "";
    let s = String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // ngăn Excel thực thi công thức
    if (s.includes('"') || s.includes(",") || /\r|\n/.test(s)) {
        s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const event = searchParams.get("event") || "wedding-2025";
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const withIp = searchParams.get("withIp") === "1";
    const format = (searchParams.get("format") || "csv").toLowerCase(); // csv | xlsx

    // ✅ Check đăng nhập (App Router)
    const supabase = createRouteHandlerClient({ cookies });
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ⚠️ Query bằng admin (bypass RLS) — chỉ nên dùng sau auth gate
    const admin = supabaseAdmin();
    let query = admin
        .from("wedding_rsvps")
        .select("id,event_key,name,phone,guests_count,relation_key,relation_note,message,source_ip,created_at")
        .eq("event_key", event)
        .order("created_at", { ascending: false });

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data, error } = await query;
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    let rows = (data ?? []) as RsvpRow[];

    // Lọc giống UI
    if (q) {
        rows = rows.filter(
            (r) =>
                (r.name || "").toLowerCase().includes(q) ||
                (r.phone || "").toLowerCase().includes(q) ||
                relationLabel(String(r.relation_key)).toLowerCase().includes(q) ||
                (r.relation_note || "").toLowerCase().includes(q) ||
                (r.message || "").toLowerCase().includes(q)
        );
    }

    // -------- XLSX (server-side) --------
    if (format === "xlsx") {
        const XLSX = await import("xlsx");

        // Chuẩn hóa dữ liệu cho sheet (tránh any)
        type SheetValue = string | number;
        type SheetRow = Record<string, SheetValue>;
        const sheetData: SheetRow[] = rows.map((r, i) => {
            const base: SheetRow = {
                STT: i + 1,
                event_key: r.event_key,
                name: r.name ?? "",
                phone: r.phone ?? "",
                relation_key: String(r.relation_key ?? ""),
                relation_label: relationLabel(String(r.relation_key)),
                relation_note: r.relation_note ?? "",
                guests_count: r.guests_count,
                message: r.message ?? "",
                created_at: r.created_at,
                created_at_vi: formatVN(r.created_at),
            };
            if (withIp) base.source_ip = r.source_ip ?? "";
            return base;
        });

        // Khai báo kiểu tường minh cho worksheet/workbook
        const ws: import("xlsx").WorkSheet = XLSX.utils.json_to_sheet(sheetData);
        const wb: import("xlsx").WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "RSVP");

        // Auto-fit cột đơn giản (không dùng any)
        const headers = Object.keys(sheetData[0] ?? {});
        const cols: import("xlsx").ColInfo[] = headers.map((h) => {
            const maxLen = Math.max(h.length, ...sheetData.map((row) => String(row[h] ?? "").length));
            return { wch: Math.min(Math.max(Math.ceil(maxLen * 1.2), 8), 60) };
        });
        ws["!cols"] = cols;

        const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
        return new NextResponse(buf, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="rsvps-${event}.xlsx"`,
                "Cache-Control": "no-store",
            },
        });
    }

    // -------- CSV (streaming + BOM) --------
    const header = [
        "STT",
        "event_key",
        "name",
        "phone",
        "relation_key",
        "relation_label",
        "relation_note",
        "guests_count",
        "message",
        ...(withIp ? ["source_ip"] : []),
        "created_at",
        "created_at_vi",
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode("\uFEFF")); // BOM để Excel đọc UTF-8
            controller.enqueue(encoder.encode(header.join(",") + "\n"));

            rows.forEach((r, idx) => {
                const line =
                    [
                        safeCsv(idx + 1),
                        safeCsv(r.event_key),
                        safeCsv(r.name ?? ""),
                        safeCsv(r.phone ?? ""),
                        safeCsv(r.relation_key ?? ""),
                        safeCsv(relationLabel(String(r.relation_key))),
                        safeCsv(r.relation_note ?? ""),
                        safeCsv(r.guests_count),
                        safeCsv(r.message ?? ""),
                        ...(withIp ? [safeCsv(r.source_ip ?? "")] : []),
                        safeCsv(r.created_at),
                        safeCsv(formatVN(r.created_at)),
                    ].join(",") + "\n";

                controller.enqueue(encoder.encode(line));
            });

            controller.close();
        },
    });

    return new NextResponse(stream, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="rsvps-${event}.csv"`,
            "Cache-Control": "no-store",
        },
    });
}
