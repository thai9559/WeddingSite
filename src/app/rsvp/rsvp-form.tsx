"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
// 🎉 Hiệu ứng pháo hoa 2.5 giây

function romanticGlitter() {
  const end = Date.now() + 3000;

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#ffe6f7", "#ffcfdf", "#f9e2ae"],
      scalar: 0.9,
      zIndex: 9999,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#ffe6f7", "#ffcfdf", "#f9e2ae"],
      scalar: 0.9,
      zIndex: 9999,
    });

    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

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

/** --- Helpers: validate & normalize VN phone --- */
const clean = (s: string) => s.replace(/[^\d+]/g, "").trim();
/** Chuẩn hoá: +84xxxxxxxxx -> 0xxxxxxxxx; giữ nguyên 0xxxxxxxxx */
const normalizeVNPhone = (input?: string) => {
  if (!input) return "";
  const s = clean(input);
  if (s.startsWith("+84")) return "0" + s.slice(3);
  return s;
};
/** Hợp lệ khi trống (optional) hoặc khớp đầu số di động VN */
const isValidVNPhone = (input?: string) => {
  if (!input || !input.trim()) return true; // optional
  const normalized = normalizeVNPhone(input);
  return /^0(3|5|7|8|9)\d{8}$/.test(normalized);
};

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
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const v = e.currentTarget.value;
      setForm((s) => ({
        ...s,
        [k]:
          k === "guests_count" ? Number(v) : (v as unknown as Form[typeof k]),
      }));
    };

  const phoneError = useMemo(() => {
    if (!form.phone) return null;
    return isValidVNPhone(form.phone)
      ? null
      : "Số điện thoại không hợp lệ (VN).";
  }, [form.phone]);

  const canSubmit = useMemo(() => {
    if (!form.name.trim()) return false;
    if (form.guests_count < 1) return false;
    if (form.relation_key === "other" && !form.relation_note?.trim())
      return false;
    if (!isValidVNPhone(form.phone)) return false; // chặn khi SĐT sai định dạng
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
          // gửi phone đã normalize về 0xxxxxxxxx (nếu có)
          phone: form.phone?.trim() ? normalizeVNPhone(form.phone) : undefined,
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
        romanticGlitter();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Có lỗi mạng. Vui lòng thử lại.";
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto">
      {/* Khung giấy retro */}
      <div
        className="relative overflow-hidden rounded-[1.25rem] border-[3.5px] border-[#c1a374]/70 bg-[#fdf7ec] shadow-[4px_4px_0_#b18b52]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 5px)",
        }}
      >
        {/* viền trong mỏng */}
        <div className="pointer-events-none absolute inset-0 rounded-[1.1rem] ring-1 ring-inset ring-[#d2b686]/40" />

        {/* header ribbon */}
        <div className="px-6 pt-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#b18b52] px-5 py-1.5 text-sm  tracking-wide text-[#fdf7ec] shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] font-[var(--font-garamond)]">
            <span className="text-xs">✉️</span> Thông tin đăng ký
          </div>
          <p className="mt-3 text-[13px] text-[#6b5b3d] font-[var(--font-garamond)]">
            Chọn mối quan hệ và điền vài thông tin để tụi mình sắp xếp chu đáo
            nhé.
          </p>
        </div>

        {(err || ok) && (
          <div className="px-6 pt-5">
            {err && (
              <div className="mb-4 rounded-xl border-2 border-[#8b3a3a] bg-[#fbe9e7] px-4 py-3 text-[#6e2c2c] text-sm shadow-[2px_2px_0_#8b3a3a] font-[var(--font-garamond)]">
                {err}
              </div>
            )}
            {ok && (
              <div className="mb-4 rounded-xl border-2 border-[#557a48] bg-[#f0f7eb] px-4 py-3 text-[#3d5e34] text-sm shadow-[2px_2px_0_#557a48] font-[var(--font-garamond)]">
                {ok}
              </div>
            )}
          </div>
        )}

        {/* thành công: chỉ hiện nút quay về */}
        {ok ? (
          <div className="px-6 pb-8 pt-4 text-center space-y-4">
            <Link
              href="/"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-[#8b6b4a] bg-[#b18b52] px-6 py-3 text-[#fdf7ec] shadow-[4px_4px_0_#8b6b4a] transition-transform hover:translate-y-[-1px] active:translate-y-[1px] font-[var(--font-garamond)] text-sm tracking-wide"
            >
              ⟵ Về trang chủ
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 pb-7 pt-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Họ tên */}
              <div>
                <label className="block text-xs  tracking-wider uppercase text-[#7a6a4a] mb-1 font-[var(--font-garamond)]">
                  Họ tên <span className="text-[#8b3a3a]">*</span>
                </label>
                <input
                  className="w-full rounded-xl border-2 border-[#c1a374] bg-[#fffaf0] px-3 py-2.5 text-[#473d2a] placeholder:text-[#b6a482] outline-none focus:ring-0 focus:border-[#8b6b4a]"
                  value={form.name}
                  onChange={onChange("name")}
                  placeholder="Nguyễn Văn A"
                  required
                  disabled={submitting}
                />
              </div>

              {/* Số điện thoại (optional + validate) */}
              <div>
                <label className="block text-xs  tracking-wider uppercase text-[#7a6a4a] mb-1 font-[var(--font-garamond)]">
                  Số điện thoại
                </label>
                <input
                  className={`w-full rounded-xl border-2 bg-[#fffaf0] px-3 py-2.5 text-[#473d2a] placeholder:text-[#b6a482] outline-none focus:ring-0 ${
                    phoneError
                      ? "border-[#8b3a3a] focus:border-[#8b3a3a]"
                      : "border-[#c1a374] focus:border-[#8b6b4a]"
                  }`}
                  value={form.phone}
                  onChange={onChange("phone")}
                  placeholder="Tuỳ chọn (VD: 09xxxxxxxx hoặc +843xxxxxxxx)"
                  disabled={submitting}
                  inputMode="tel"
                />
                {phoneError && (
                  <p className="text-[11px] text-[#8b3a3a] mt-1 font-[var(--font-garamond)]">
                    {phoneError}
                  </p>
                )}
              </div>

              {/* Số khách */}
              <div>
                <label className="block text-xs  tracking-wider uppercase text-[#7a6a4a] mb-1 font-[var(--font-garamond)]">
                  Số khách <span className="text-[#8b3a3a]">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-xl border-2 border-[#c1a374] bg-[#fffaf0] px-3 py-2.5 text-[#473d2a] placeholder:text-[#b6a482] outline-none focus:ring-0 focus:border-[#8b6b4a]"
                  value={form.guests_count}
                  onChange={onChange("guests_count")}
                  required
                  disabled={submitting}
                />
                <p className="text-[11px] text-[#7a6a4a] mt-1 font-[var(--font-garamond)]">
                  Bao gồm cả bạn và người đi cùng (nếu có).
                </p>
              </div>

              {/* Bạn là ai? */}
              <div>
                <label className="block text-xs  tracking-wider uppercase text-[#7a6a4a] mb-1 font-[var(--font-garamond)]">
                  Bạn là ai?
                </label>
                <div className="relative">
                  <select
                    className="appearance-none w-full rounded-xl border-2 border-[#c1a374] bg-[#fffaf0] px-3 py-2.5 pr-9 text-[#473d2a] outline-none focus:ring-0 focus:border-[#8b6b4a]"
                    value={form.relation_key}
                    onChange={onChange("relation_key")}
                    disabled={submitting}
                  >
                    {RELATION_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8b6b4a] font-[var(--font-garamond)]">
                    ▾
                  </span>
                </div>
              </div>
            </div>

            {/* Nếu Khác, yêu cầu ghi rõ */}
            {form.relation_key === "other" && (
              <div>
                <label className="block text-xs  tracking-wider uppercase text-[#7a6a4a] mb-1 font-[var(--font-garamond)]">
                  Ghi rõ “Khác” <span className="text-[#8b3a3a]">*</span>
                </label>
                <input
                  className="w-full rounded-xl border-2 border-[#c1a374] bg-[#fffaf0] px-3 py-2.5 text-[#473d2a] placeholder:text-[#b6a482] outline-none focus:ring-0 focus:border-[#8b6b4a]"
                  value={form.relation_note}
                  onChange={onChange("relation_note")}
                  placeholder="Ví dụ: bạn thân từ cấp 3, hàng xóm…"
                  required
                  disabled={submitting}
                />
              </div>
            )}

            {/* Lời nhắn */}
            <div>
              <label className="block text-xs  tracking-wider uppercase text-[#7a6a4a] mb-1 font-[var(--font-garamond)]">
                Lời nhắn
              </label>
              <textarea
                rows={4}
                className="w-full rounded-xl border-2 border-[#c1a374] bg-[#fffaf0] px-3 py-2.5 text-[#473d2a] placeholder:text-[#b6a482] outline-none focus:ring-0 focus:border-[#8b6b4a]"
                value={form.message}
                onChange={onChange("message")}
                placeholder="Ví dụ: lời chúc,..."
                maxLength={500}
                disabled={submitting}
              />
              <div className="text-right text-[11px] text-[#9a8a6a] mt-1 font-[var(--font-garamond)]">
                {form.message?.length || 0}/500
              </div>
            </div>

            {/* submit */}
            <div>
              <button
                disabled={submitting || !canSubmit}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-[#8b6b4a] bg-[#b18b52] px-6 py-2.5 text-[#fdf7ec] shadow-[4px_4px_0_#8b6b4a] transition-transform hover:translate-y-[-1px] active:translate-y-[0px] disabled:opacity-60 font-[var(--font-garamond)]"
              >
                {submitting ? (
                  <>
                    <span className="inline-flex h-4 w-4 items-center justify-center">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                    </span>
                    Đang gửi...
                  </>
                ) : (
                  "Gửi xác nhận"
                )}
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-[#7a6a4a] font-[var(--font-garamond)]">
              Chúng mình chỉ dùng thông tin để tổ chức sự kiện; không chia sẻ ra
              ngoài.
            </p>
          </form>
        )}

        <div className="pointer-events-none absolute top-2 left-2 text-[#b18b52]/50 text-sm font-[var(--font-garamond)]">
          ✽
        </div>
        <div className="pointer-events-none absolute bottom-2 right-2 text-[#b18b52]/50 text-sm font-[var(--font-garamond)]">
          ✽
        </div>
      </div>
    </div>
  );
}
