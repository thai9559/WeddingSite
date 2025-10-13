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

export default function AdminRSVPTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");

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

  return (
    <div className="rounded-2xl border overflow-hidden bg-white">
      <div className="p-4 flex items-center justify-between gap-3 border-b">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên, số điện thoại, quan hệ, ghi chú…"
          className="w-full border rounded-xl px-3 py-2 text-sm"
        />
        <a
          href={`/api/rsvps/export?event=${encodeURIComponent(
            rows[0]?.event_key || ""
          )}`}
          className="ml-3 px-3 py-2 rounded-xl bg-black text-white text-sm whitespace-nowrap"
        >
          Tải CSV
        </a>
      </div>

      <div className="overflow-x-auto">
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
                {/* STT tự tăng 1 → n theo danh sách đang hiển thị */}
                <td className="px-4 py-3">{i + 1}</td>
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3">{r.phone}</td>
                <td className="px-4 py-3">{relationLabel(r.relation_key)}</td>
                <td className="px-4 py-3">{r.guests_count}</td>
                <td
                  className="px-4 py-3 max-w-[320px] truncate"
                  title={r.message || ""}
                >
                  {r.message}
                </td>
                <td className="px-4 py-3">
                  {new Date(r.created_at).toLocaleString("vi-VN")}
                </td>
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
