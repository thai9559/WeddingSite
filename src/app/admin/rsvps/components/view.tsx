// src/app/admin/rsvps/view.tsx
"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminRSVPTable from "../table";
import type { TableRow } from "../page";

const RELATION_LABELS: Record<string, string> = {
  bride_friend: "Bạn cô dâu",
  groom_friend: "Bạn chú rể",
  coworker: "Đồng nghiệp",
  family: "Họ hàng",
  other: "Khác",
};

const RELATION_OPTIONS = [
  { key: "all", label: "Tất cả mối quan hệ" },
  { key: "bride_friend", label: RELATION_LABELS.bride_friend },
  { key: "groom_friend", label: RELATION_LABELS.groom_friend },
  { key: "coworker", label: RELATION_LABELS.coworker },
  { key: "family", label: RELATION_LABELS.family },
  { key: "other", label: RELATION_LABELS.other },
];

function humanizeRelation(key: string) {
  return RELATION_LABELS[key] ?? key.replace(/_/g, " ");
}

type Props = {
  eventKey: string;
  rows: TableRow[];
};

// Totals: rsvps = số bản ghi; people = tổng người dự kiến
type Totals = { rsvps: number; people: number };

// Quy ước: guests_count là số ghế/người dự kiến cho mỗi RSVP.
// Nếu null/0 thì hiểu là ít nhất 1 người (người đăng ký chính).
function seatsOf(r: TableRow) {
  const n = r.guests_count ?? 0;
  return n > 0 ? n : 1;
}

function calcTotals(rows: TableRow[]) {
  let rsvps = 0;
  let people = 0;
  for (const r of rows) {
    rsvps += 1;
    people += seatsOf(r);
  }
  return { rsvps, people };
}

function groupCounts(rows: TableRow[]) {
  const map = new Map<string, Totals>();
  for (const r of rows) {
    const k = r.relation_key || "other";
    const prev = map.get(k) ?? { rsvps: 0, people: 0 };
    map.set(k, {
      rsvps: prev.rsvps + 1,
      people: prev.people + seatsOf(r),
    });
  }
  return Array.from(map.entries()); // [key, { rsvps, people }][]
}

export default function RSVPView({ eventKey, rows: initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<TableRow[]>(initialRows);
  const [q, setQ] = useState("");
  const [relation, setRelation] = useState<string>("all");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchText =
        !s ||
        (r.name || "").toLowerCase().includes(s) ||
        (r.phone || "").toLowerCase().includes(s) ||
        (r.relation_key || "").toLowerCase().includes(s) ||
        (r.relation_note || "").toLowerCase().includes(s) ||
        (r.message || "").toLowerCase().includes(s);

      const matchRelation =
        relation === "all" || (r.relation_key || "other") === relation;

      return matchText && matchRelation;
    });
  }, [rows, q, relation]);

  const { rsvps: totalRSVPs, people: totalPeople } = useMemo(
    () => calcTotals(filtered),
    [filtered]
  );

  const byRelationEntries = useMemo(() => groupCounts(filtered), [filtered]);

  const onClickCard = useCallback((key: string) => {
    setRelation((prev) => (prev === key ? "all" : key)); // click lại để bỏ lọc
  }, []);

  return (
    <>
      {/* Header + Filter + Search */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">RSVPs — {eventKey}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Tổng người dự kiến: <b>{totalPeople}</b> · Số RSVP:{" "}
            <b>{totalRSVPs}</b>
          </p>
          {relation !== "all" && (
            <p className="mt-1 text-xs text-neutral-500">
              Đang lọc theo: <b>{humanizeRelation(relation)}</b>
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên, SĐT, ghi chú..."
            className="w-full sm:w-64 border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
          />
          <select
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm"
          >
            {RELATION_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards mối quan hệ — click là lọc ngay */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {byRelationEntries.length > 0 ? (
          byRelationEntries.map(([k, v]) => {
            const active = relation === k;
            return (
              <button
                key={k}
                onClick={() => onClickCard(k)}
                className={[
                  "group relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-300",
                  active
                    ? "border-transparent bg-gradient-to-br from-pink-100 via-rose-100 to-orange-100 shadow-md ring-2 ring-rose-300"
                    : "border-neutral-200 bg-white hover:shadow-md hover:-translate-y-0.5",
                ].join(" ")}
              >
                {/* viền động nhẹ khi hover */}
                <span
                  className={[
                    "absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none",
                    active
                      ? "opacity-100 bg-gradient-to-tr from-rose-200/40 to-orange-200/40"
                      : "opacity-0 group-hover:opacity-60 bg-gradient-to-tr from-rose-100/30 to-orange-100/30",
                  ].join(" ")}
                />
                <div className="relative z-10">
                  <div
                    className={[
                      "text-xs font-semibold uppercase tracking-wide mb-2 transition-colors",
                      active
                        ? "text-rose-600"
                        : "text-neutral-500 group-hover:text-rose-500",
                    ].join(" ")}
                  >
                    {humanizeRelation(k)}
                  </div>
                  <div className="flex items-baseline gap-1 text-sm">
                    <span className="text-lg font-bold text-neutral-900">
                      {v.people}
                    </span>
                    <span className="text-neutral-500">người</span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {v.rsvps} lượt đăng ký
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="col-span-full text-sm text-neutral-500 text-center py-6 border rounded-xl bg-neutral-50">
            Không có bản ghi phù hợp.
          </div>
        )}
      </div>

      {/* Bảng */}
      <AdminRSVPTable
        rows={filtered}
        eventKey={eventKey}
        onDelete={(id) => {
          setRows((prev) => prev.filter((r) => r.id !== id));
          router.refresh();
        }}
      />
    </>
  );
}
