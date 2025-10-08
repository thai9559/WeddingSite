"use client";

import { useMemo, useState } from "react";

type RelationKey =
  | "bride_friend"
  | "groom_friend"
  | "coworker"
  | "family"
  | "other";

type Form = {
  name: string;
  phone?: string;
  guests_count: number;
  relation_key: RelationKey;
  relation_note?: string;
  message?: string;
};

const RELATION_OPTIONS: { key: RelationKey; label: string }[] = [
  { key: "bride_friend", label: "Bạn cô dâu" },
  { key: "groom_friend", label: "Bạn chú rể" },
  { key: "coworker", label: "Đồng nghiệp" },
  { key: "family", label: "Họ hàng" },
  { key: "other", label: "Khác" },
];

export default function RSVPForm() {
  const [form, setForm] = useState<Form>({
    name: "",
    phone: "",
    guests_count: 1,
    relation_key: "bride_friend",
    relation_note: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onChange =
    (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.currentTarget.value;
      setForm((s) => ({ ...s, [k]: k === "guests_count" ? Number(v) : v }));
    };

  const canSubmit = useMemo(() => {
    if (!form.name.trim()) return false;
    if (form.guests_count < 1) return false;
    if (form.relation_key === "other" && !form.relation_note?.trim())
      return false;
    return true;
  }, [form]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_key: "wedding-2025",
          name: form.name,
          phone: form.phone,
          guests_count: form.guests_count,
          relation_key: form.relation_key,
          relation_note:
            form.relation_key === "other" ? form.relation_note : undefined,
          message: form.message,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || "Gửi thất bại.");
      } else {
        setOk("Đăng ký thành công! Hẹn gặp bạn tại đám cưới 💖");
        setForm({
          name: "",
          phone: "",
          guests_count: 1,
          relation_key: "bride_friend",
          relation_note: "",
          message: "",
        });
      }
    } catch (err: unknown) {
      // ← thay any bằng unknown
      const msg =
        err instanceof Error ? err.message : "Có lỗi mạng. Vui lòng thử lại.";
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto">
      <div className="rounded-2xl border border-neutral-200 shadow-sm bg-white">
        <div className="px-6 py-5 border-b border-neutral-100">
          <h3 className="text-lg font-semibold">Thông tin đăng ký</h3>
          <p className="text-sm text-neutral-600 mt-1">
            Chọn mối quan hệ và điền một vài thông tin giúp tụi mình sắp xếp
            nhé.
          </p>
        </div>

        {(err || ok) && (
          <div className="px-6 pt-5">
            {err && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                {err}
              </div>
            )}
            {ok && (
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700 text-sm">
                {ok}
              </div>
            )}
          </div>
        )}

        <form onSubmit={submit} className="px-6 pb-6 pt-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Họ tên <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-black/10 focus:border-black/30"
                value={form.name}
                onChange={onChange("name")}
                placeholder="Nguyễn Văn A"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Số điện thoại
              </label>
              <input
                className="w-full border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-black/10 focus:border-black/30"
                value={form.phone}
                onChange={onChange("phone")}
                placeholder="Tuỳ chọn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Số khách <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-black/10 focus:border-black/30"
                type="number"
                min={1}
                value={form.guests_count}
                onChange={onChange("guests_count")}
                required
              />
              <p className="text-xs text-neutral-500 mt-1">
                Bao gồm cả bạn và người đi cùng (nếu có).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Bạn là ai?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {RELATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() =>
                      setForm((s) => ({ ...s, relation_key: opt.key }))
                    }
                    className={[
                      "px-3 py-2 rounded-xl border text-sm",
                      form.relation_key === opt.key
                        ? "border-black bg-black text-white"
                        : "border-neutral-300 hover:border-neutral-400",
                    ].join(" ")}
                    aria-pressed={form.relation_key === opt.key}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {form.relation_key === "other" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Ghi rõ “Khác” <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-black/10 focus:border-black/30"
                value={form.relation_note}
                onChange={onChange("relation_note")}
                placeholder="Ví dụ: bạn thân từ cấp 3, hàng xóm…"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Lời nhắn</label>
            <textarea
              className="w-full border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-black/10 focus:border-black/30"
              rows={4}
              value={form.message}
              onChange={onChange("message")}
              placeholder="Ví dụ: ăn chay, dị ứng, dự kiến giờ đến..."
              maxLength={500}
            />
            <div className="text-right text-xs text-neutral-400 mt-1">
              {form.message?.length || 0}/500
            </div>
          </div>

          <div>
            <button
              disabled={submitting || !canSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 bg-black text-white hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="inline-flex h-4 w-4 items-center justify-center">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                  </span>
                  Đang gửi...
                </>
              ) : (
                "Gửi đăng ký"
              )}
            </button>
          </div>

          <p className="text-[11px] leading-relaxed text-neutral-500">
            Chúng mình chỉ dùng thông tin để tổ chức sự kiện; không chia sẻ ra
            ngoài.
          </p>
        </form>
      </div>
    </div>
  );
}
