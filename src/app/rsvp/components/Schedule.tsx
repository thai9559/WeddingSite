export default function Schedule() {
  const items = [
    { t: "09:30", d: "Đón khách & check-in" },
    { t: "10:00", d: "Khai mạc & làm lễ" },
    { t: "10:45", d: "Dùng tiệc" },
    { t: "12:30", d: "Chụp ảnh & giao lưu" },
  ];

  return (
    <section
      className="relative overflow-hidden rounded-[1.25rem] border-4 border-[#c1a374]/70 bg-[#fdf7ec] p-7 shadow-[4px_4px_0_#b18b52]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0 2px, transparent 2px 4px)",
      }}
    >
      {/* Hoa văn góc */}
      <div className="pointer-events-none absolute top-2 left-2 text-[#b18b52]/50 text-sm font-[var(--font-garamond)]">
        ✽
      </div>
      <div className="pointer-events-none absolute bottom-2 right-2 text-[#b18b52]/50 text-sm font-[var(--font-garamond)]">
        ✽
      </div>

      {/* Tiêu đề kiểu ribbon */}
      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#b18b52] px-5 py-1.5 text-sm tracking-wide text-[#fdf7ec] shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] font-[var(--font-garamond)]">
        <span className="text-xs">⏰</span> Lịch trình dự kiến
      </div>

      {/* Danh sách */}
      <ol className="space-y-4 text-[#473d2a] font-[var(--font-garamond)]">
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-start gap-3 border-b border-dashed border-[#c1a374]/40 pb-3 last:border-0 last:pb-0"
          >
            <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#b18b52]" />
            <div className="flex-1">
              <p className="text-[17px] leading-snug">{it.d}</p>
              <p className="text-[13px] text-[#6b5b3d]">{it.t}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Ghi chú cuối */}
      <p className="mt-6 text-center text-xs italic text-[#7a6a4a] font-[var(--font-garamond)]">
        *Lịch trình có thể thay đổi nhẹ để phù hợp thực tế.
      </p>

      {/* Viền trang trí ngoài */}
      <div className="pointer-events-none absolute inset-0 rounded-[1.25rem] ring-1 ring-inset ring-[#d2b686]/30" />
    </section>
  );
}
