// src/app/admin/rsvps/page.tsx
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import AdminRSVPTable from "./table";

type SearchParams = { event?: string };

type DBRow = {
  id: number;
  event_key: string;
  name: string | null;
  phone: string | null;
  guests_count: number | null;
  relation_key: string;
  relation_note: string | null;
  message: string | null;
  created_at: string;
};

export type TableRow = Omit<DBRow, "guests_count"> & {
  guests_count: number;
};

type Totals = { people: number; guests: number };

function humanizeRelation(key: string) {
  return key.replace(/_/g, " ");
}

function groupCounts(rows: TableRow[]) {
  const byRelation = new Map<string, Totals>();
  let totalPeople = 0;
  let totalGuests = 0;

  for (const r of rows) {
    const guests = r.guests_count ?? 0;
    totalPeople += 1;
    totalGuests += guests;

    const k = r.relation_key || "khác";
    const prev = byRelation.get(k) ?? { people: 0, guests: 0 };
    byRelation.set(k, {
      people: prev.people + 1,
      guests: prev.guests + guests,
    });
  }

  return {
    byRelationEntries: Array.from(byRelation.entries()),
    totalPeople,
    totalGuests,
  };
}

export async function generateMetadata(props: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await props.searchParams) ?? {};
  const title = sp.event ? `Admin | RSVPs — ${sp.event}` : "Admin | RSVPs";
  return { title };
}

export default async function AdminRSVPPage(props: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await props.searchParams) ?? {};
  const eventKey = sp.event || "wedding-2025";

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("wedding_rsvps")
    .select(
      "id,event_key,name,phone,guests_count,relation_key,relation_note,message,created_at"
    )
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

  const dbRows = (data ?? []) as DBRow[];

  const tableRows: TableRow[] = dbRows.map((r) => ({
    ...r,
    guests_count: r.guests_count ?? 0,
  }));

  const { byRelationEntries, totalPeople, totalGuests } =
    groupCounts(tableRows);

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">RSVPs — {eventKey}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Tổng khách đăng ký: <b>{totalPeople}</b> · Tổng số ghế
            (guests_count): <b>{totalGuests}</b>
          </p>
        </div>

        <form className="flex items-center gap-2" action="/admin/rsvps">
          <input
            name="event"
            defaultValue={eventKey}
            placeholder="event_key"
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <button
            className="px-3 py-2 rounded-xl bg-black text-white text-sm"
            type="submit"
          >
            Lọc
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {byRelationEntries.map(([k, v]) => (
          <div key={k} className="rounded-xl border px-3 py-3">
            <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
              {humanizeRelation(k)}
            </div>
            <div className="text-sm">
              <b>{v.people}</b> người · <b>{v.guests}</b> ghế
            </div>
          </div>
        ))}
        {byRelationEntries.length === 0 && (
          <div className="col-span-full text-sm text-neutral-500">
            Chưa có bản ghi nào cho sự kiện này.
          </div>
        )}
      </div>

      <AdminRSVPTable rows={tableRows} />
    </main>
  );
}
