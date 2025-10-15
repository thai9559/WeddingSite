"use client";

import { useMemo, useState } from "react";

type Row = {
  id: number;
  event_key: string;
  name: string | null;
  phone: string | null;
  guests_count: number;
  relation_key: string;
  relation_note: string | null;
  message: string | null;
  created_at: string;
};

const RELATION_LABELS: Record<string, string> = {
  bride_friend: "Bạn cô dâu",
  groom_friend: "Bạn chú rể",
  coworker: "Đồng nghiệp",
  family: "Họ hàng",
  other: "Khác",
};

function relationLabel(key: string) {
  return RELATION_LABELS[key] ?? "Khác";
}

function formatVNTime(iso: string) {
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

/** Lấy filename từ header Content-Disposition (nếu server set) */
function filenameFromHeaders(res: Response, fallback: string) {
  const cd =
    res.headers.get("Content-Disposition") ||
    res.headers.get("content-disposition");
  if (!cd) return fallback;
  // support: filename="rsvps-xxx.xlsx" hoặc filename*=UTF-8''rsvps-xxx.xlsx
  const m =
    /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd) ||
    /filename="?([^"]+)"?/i.exec(cd);
  return m ? decodeURIComponent(m[1]) : fallback;
}

async function downloadFromApi(url: string, fallbackName: string) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const name = filenameFromHeaders(res, fallbackName);
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

export default function AdminRSVPTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [downloading, setDownloading] = useState<"csv" | "xlsx" | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      return (
        (r.name || "").toLowerCase().includes(s) ||
        (r.phone || "").toLowerCase().includes(s) ||
        relationLabel(r.relation_key).toLowerCase().includes(s) ||
        (r.relation_note || "").toLowerCase().includes(s) ||
        (r.message || "").toLowerCase().includes(s)
      );
    });
  }, [rows, q]);

  // ...
  const eventKey = rows[0]?.event_key || "wedding-2025";
  const buildExportUrl = (format: "csv" | "xlsx") => {
    const params = new URLSearchParams({ event: eventKey });
    if (q.trim()) params.set("q", q.trim());
    if (format === "xlsx") params.set("format", "xlsx");
    // ⬇️ Sửa từ /api/... thành /admin/rsvps/export
    return `/admin/rsvps/export?${params.toString()}`;
  };
  // ...

  const onDownload = async (format: "csv" | "xlsx") => {
    try {
      setDownloading(format);
      const url = buildExportUrl(format);
      const fallback = `rsvps-${eventKey}.${format}`;
      await downloadFromApi(url, fallback);
    } catch (e: any) {
      alert(e?.message || "Xuất dữ liệu thất bại.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="rounded-2xl border overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="p-4 flex flex-col gap-3 border-b md:flex-row md:items-center md:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên, số điện thoại, quan hệ, ghi chú…"
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onDownload("csv")}
            disabled={downloading === "csv"}
            className="px-3 py-2 rounded-xl bg-neutral-700 text-white text-sm whitespace-nowrap disabled:opacity-60"
            title="Tải CSV (áp dụng bộ lọc hiện tại)"
          >
            {downloading === "csv" ? "Đang tải…" : "Tải CSV"}
          </button>
        </div>
      </div>

      {/* Mobile list (< md) */}
      <div className="md:hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-neutral-500">
            Không có kết quả phù hợp.
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((r, i) => (
              <li key={r.id} className="p-4 space-y-3">
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="text-sm text-neutral-500">#{i + 1}</div>
                  <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                    {relationLabel(r.relation_key)}
                    <span className="opacity-60">•</span>
                    <b>{r.guests_count}</b> khách
                  </div>
                </div>

                {/* 3 cột */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-neutral-500">Tên</div>
                    <div className="font-medium text-sm break-words">
                      {r.name || "(Chưa có tên)"}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-neutral-500">
                      Số điện thoại
                    </div>
                    {r.phone ? (
                      <a
                        href={`tel:${r.phone}`}
                        className="text-sm text-blue-600 hover:underline break-words"
                      >
                        {r.phone}
                      </a>
                    ) : (
                      <div className="text-sm text-neutral-500">—</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-neutral-500">Thời gian</div>
                    <div className="text-xs text-neutral-600">
                      {formatVNTime(r.created_at)}
                    </div>
                  </div>
                </div>

                {/* Lời nhắn */}
                {r.message && (
                  <div>
                    <div className="text-xs text-neutral-500">Lời nhắn</div>
                    <div className="text-sm text-neutral-700 whitespace-pre-line">
                      {r.message}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Desktop table (md+) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-700">
            <tr>
              <th className="text-left px-4 py-3">STT</th>
              <th className="text-left px-4 py-3">Tên</th>
              <th className="text-left px-4 py-3">SĐT</th>
              <th className="text-left px-4 py-3">Quan hệ</th>
              <th className="text-left px-4 py-3">Số khách</th>
              <th className="text-left px-4 py-3">Lời nhắn</th>
              <th className="text-left px-4 py-3">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3">{i + 1}</td>
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3">
                  {r.phone ? (
                    <a
                      href={`tel:${r.phone}`}
                      className="hover:underline text-blue-600"
                    >
                      {r.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">{relationLabel(r.relation_key)}</td>
                <td className="px-4 py-3">{r.guests_count}</td>
                <td
                  className="px-4 py-3 max-w-[360px] truncate"
                  title={r.message || ""}
                >
                  {r.message}
                </td>
                <td className="px-4 py-3">{formatVNTime(r.created_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-neutral-500"
                  colSpan={7}
                >
                  Không có kết quả phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
