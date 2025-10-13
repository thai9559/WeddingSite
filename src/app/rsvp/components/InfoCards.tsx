import { EVENT } from "@/app/rsvp/event";
import { IconLocation } from "./Icons";

export default function InfoCards() {
  return (
    <section
      className="relative overflow-hidden rounded-[1.25rem] border-[3.5px] border-[#c1a374]/70 bg-[#fdf7ec] p-7 shadow-[4px_4px_0_#b18b52] font-[var(--font-garamond)]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 4px)",
      }}
    >
      {/* Hoa văn góc */}
      <div className="pointer-events-none absolute top-2 left-2 text-[#b18b52]/50 text-sm">
        ✽
      </div>
      <div className="pointer-events-none absolute bottom-2 right-2 text-[#b18b52]/50 text-sm">
        ✽
      </div>

      {/* Tiêu đề kiểu ribbon */}
      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#b18b52] px-5 py-1.5 text-sm tracking-wide text-[#fdf7ec] shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]">
        <IconLocation className="h-5 w-5 text-[#fdf7ec]" />
        <span>Địa điểm & Thời gian</span>
      </div>

      {/* Nội dung */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 text-[#473d2a]">
        {/* Thông tin */}
        <div className="md:col-span-2 space-y-2">
          <p className="text-[18px]">{EVENT.venueName}</p>
          <p className="text-[14px] text-[#6b5b3d] leading-snug">
            {EVENT.venueAddr}
          </p>

          <div className="mt-4 text-[14px] leading-relaxed">
            <p>
              <span className="text-[#b18b52]">⏰</span>{" "}
              <span>
                <strong>Thời gian:</strong> {EVENT.dateText}, {EVENT.timeText}
              </span>
            </p>
          </div>
        </div>

        {/* Bản đồ */}
        <div className="md:col-span-3">
          <div className="aspect-[16/10] w-full overflow-hidden rounded-xl border-2 border-[#c1a374]/60 shadow-[3px_3px_0_#b18b52]/50">
            <iframe
              src={EVENT.mapEmbed}
              className="h-full w-full"
              loading="lazy"
              allowFullScreen
            />
          </div>
        </div>
      </div>

      {/* Ghi chú */}
      <p className="mt-5 text-center text-[12px] italic text-[#7a6a4a]">
        *Hãy đến sớm một chút để chụp hình check-in cùng tụi mình nhé 💐
      </p>

      {/* Viền ngoài mảnh */}
      <div className="pointer-events-none absolute inset-0 rounded-[1.25rem] ring-1 ring-inset ring-[#d2b686]/40" />
    </section>
  );
}
