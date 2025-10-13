export default function Contact() {
  return (
    <section
      className="relative overflow-hidden rounded-[1.25rem] border-[3.5px] border-[#c1a374]/70 bg-[#fdf7ec] p-7 shadow-[4px_4px_0_#b18b52] font-[var(--font-garamond)]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 5px)",
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
        💌 Liên hệ
      </div>

      {/* Nội dung */}
      <p className="text-[14px] text-[#473d2a] leading-relaxed">
        Nếu cần hỗ trợ nhanh, bạn có thể liên hệ{" "}
        <span className="text-[#b18b52]">phù dâu</span> hoặc{" "}
        <span className="text-[#b18b52]">phù rể</span> để được hướng dẫn:
      </p>

      <ul className="mt-4 space-y-1 text-[15px] text-[#473d2a]">
        <li>👰 Phù dâu: 09xx xxx xxx (Zalo)</li>
        <li>🤵 Phù rể: 09xx xxx xxx (Zalo)</li>
      </ul>

      <p className="mt-5 text-[12px] italic text-[#7a6a4a] text-center">
        *Thông tin liên hệ sẽ được cập nhật gần ngày diễn ra sự kiện.
      </p>

      {/* Viền trong mảnh */}
      <div className="pointer-events-none absolute inset-0 rounded-[1.25rem] ring-1 ring-inset ring-[#d2b686]/40" />
    </section>
  );
}
