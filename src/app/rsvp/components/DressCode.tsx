export default function DressCode({ codes }: { codes: string[] }) {
  return (
    <section
      className="relative overflow-hidden rounded-[1.25rem] border-[3.5px] border-[#c1a374]/70 bg-[#fdf7ec] p-7 shadow-[4px_4px_0_#b18b52] font-[var(--font-garamond)]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 5px)",
      }}
    >
      <div className="pointer-events-none absolute top-2 left-2 text-[#b18b52]/50 text-sm">
        ✽
      </div>
      <div className="pointer-events-none absolute bottom-2 right-2 text-[#b18b52]/50 text-sm">
        ✽
      </div>

      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#b18b52] px-5 py-1.5 text-sm tracking-wide text-[#fdf7ec] shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]">
        👗 Dress Code
      </div>

      <p className="text-[14px] text-[#473d2a] leading-relaxed mb-4">
        Tụi mình gợi ý phong cách{" "}
        <span className="text-[#b18b52]">trang nhã</span>, màu{" "}
        <span className="text-[#b18b52]">pastel/neutral</span> để tổng thể nhẹ
        nhàng, tinh tế nhé 💐
      </p>

      <div className="flex flex-wrap gap-2">
        {codes.map((c) => (
          <span
            key={c}
            className="rounded-full border-2 border-[#c1a374]/70 bg-[#fffaf0] px-3 py-1.5 text-[14px] text-[#473d2a] shadow-[2px_2px_0_#b18b52]/50"
          >
            {c}
          </span>
        ))}
      </div>

      <p className="mt-5 text-[12px] italic text-[#7a6a4a] text-center">
        *Cảm ơn bạn đã cùng hòa hợp tone màu với bọn mình nhé 💛
      </p>

      <div className="pointer-events-none absolute inset-0 rounded-[1.25rem] ring-1 ring-inset ring-[#d2b686]/40" />
    </section>
  );
}
