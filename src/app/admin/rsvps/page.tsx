// src/app/admin/rsvps/page.tsx
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import RSVPView from "./components/view";

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

export type TableRow = Omit<DBRow, "guests_count"> & { guests_count: number };

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

  const tableRows: TableRow[] = (data ?? []).map((r) => ({
    ...r,
    guests_count: r.guests_count ?? 0,
  }));

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <RSVPView eventKey={eventKey} rows={tableRows} />
    </main>
  );
}
