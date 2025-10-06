// src/app/admin/rsvps/page.tsx
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import AdminRSVPTable from "./table";
export const metadata = { title: "Admin | RSVPs" };

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

function groupCounts(rows: Row[]) {
  const byRelation: Record<string, { people: number; guests: number }> = {};
  let totalPeople = 0;
  let totalGuests = 0;

  for (const r of rows) {
    totalPeople += 1;
    totalGuests += r.guests_count ?? 0;
    if (!byRelation[r.relation_key])
      byRelation[r.relation_key] = { people: 0, guests: 0 };
    byRelation[r.relation_key].people += 1;
    byRelation[r.relation_key].guests += r.guests_count ?? 0;
  }
  return { byRelation, totalPeople, totalGuests };
}

export default async function AdminRSVPPage({
  searchParams,
}: {
  searchParams?: { event?: string };
}) {
  const eventKey = searchParams?.event || "wedding-2025";

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("wedding_rsvps")
    .select("*")
    .eq("event_key", eventKey)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-4">RSVPs</h1>
        <p className="text-red-600">Lỗi tải dữ liệu: {error.message}</p>
      </main>
    );
  }

  const rows = (data ?? []) as Row[];
  const { byRelation, totalPeople, totalGuests } = groupCounts(rows);

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">RSVPs — {eventKey}</h1>
          <p className="text-sm text-neutral-600">
            Tổng số khách đăng ký: <b>{totalPeople}</b> · Tổng số ghế
            (guests_count): <b>{totalGuests}</b>
          </p>
        </div>

        {/* lọc theo event_key bằng query param */}
        <form className="flex items-center gap-2" action="/admin/rsvps">
          <input
            name="event"
            defaultValue={eventKey}
            placeholder="event_key"
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <button className="px-3 py-2 rounded-xl bg-black text-white text-sm">
            Lọc
          </button>
        </form>
      </div>

      {/* Summary by relation */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Object.entries(byRelation).map(([k, v]) => (
          <div key={k} className="rounded-xl border px-3 py-3">
            <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
              {k.replace("_", " ")}
            </div>
            <div className="text-sm">
              <b>{v.people}</b> người · <b>{v.guests}</b> ghế
            </div>
          </div>
        ))}
      </div>

      {/* Bảng chi tiết (client để filter/search nhanh) */}
      <AdminRSVPTable rows={rows} />
    </main>
  );
}
