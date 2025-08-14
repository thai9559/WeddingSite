import ScrollReveal from "@/blocks/TextAnimations/ScrollReveal/ScrollReveal";
import Masonry from "@/blocks/Components/Masonry/Masonry";

// 20 ảnh từ /public/albums/wedding/1.jpg .. 15.jpg
const items = Array.from({ length: 15 }, (_, i) => {
  const n = i + 1;
  const heights = [520, 640, 560, 600, 500, 580, 540, 620, 560, 600];
  return {
    id: `wedding-${n}`,
    img: `/albums/wedding/${n}.jpg`, // nếu file thật là .JPG thì đổi đuôi tại đây
    url: `/albums/wedding/${n}.jpg`,
    height: heights[i % heights.length],
  };
});

export function Intro() {
  return (
    <section className="px-6">
      <div className="mx-auto mt-0 bg-white py-12 shadow-[0_2px_30px_-15px_rgba(0,0,0,0.2)]">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* GALLERY BLOCK */}
          <div
            className="
              relative w-full px-4 lg:px-8
              order-2 lg:order-1
            "
          >
            {/* MOBILE/TABLET: slider vuốt ngang (ẩn ở PC) */}
            <div className="lg:hidden -mx-6 px-6">
              <div className="mb-3 text-sm text-neutral-500">
                Vuốt để xem ảnh
              </div>
              <div
                className="
                  flex gap-4 overflow-x-auto pb-2
                  snap-x snap-mandatory
                  scroll-pl-6
                  [-ms-overflow-style:none] [scrollbar-width:none]
                "
                style={{ WebkitOverflowScrolling: "touch" }}
                role="list"
                aria-label="Wedding photo slider"
              >
                {/* Ẩn scrollbar cho WebKit */}
                <style>{`
                  .snap-x::-webkit-scrollbar { display: none; }
                `}</style>
                {items.map((it, idx) => (
                  <a
                    key={it.id}
                    href={it.url}
                    className="snap-start shrink-0 w-[82%] sm:w-[70%] rounded-xl ring-1 ring-black/5 overflow-hidden"
                    role="listitem"
                    aria-label={`Open photo ${idx + 1}`}
                  >
                    <div className="aspect-[3/4]">
                      <img
                        src={it.img}
                        alt={`Wedding photo ${idx + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* DESKTOP: Masonry (giữ nguyên y như hiện tại) */}
            <div className="hidden lg:block">
              <Masonry
                items={items}
                animateFrom="bottom"
                stagger={0.05}
                blurToFocus
                scaleOnHover
                hoverScale={0.97}
                colorShiftOnHover={false}
              />
            </div>
          </div>

          {/* TEXT BLOCK */}
          <div
            className="
              px-6 text-center lg:px-8 lg:text-left
              order-1 lg:order-2
            "
          >
            <ScrollReveal
              containerClassName="mb-4"
              textClassName="text-xs font-medium tracking-[0.45em] text-neutral-400"
              baseOpacity={0.2}
              baseRotation={4}
            >
              OUR WEDDING STORY
            </ScrollReveal>

            <ScrollReveal
              textClassName="text-[12px] leading-7 text-neutral-600"
              baseOpacity={0.1}
              baseRotation={3}
              blurStrength={3}
            >
              Đám cưới của bọn mình là một hành trình đầy yêu thương và kỷ niệm,
              nơi mỗi khoảnh khắc đều được chuẩn bị với tất cả sự trân trọng. Từ
              những ngày đầu lên ý tưởng, lựa chọn phong cách, cho đến từng chi
              tiết trang trí, bọn mình mong muốn biến ngày đặc biệt này thành
              một câu chuyện ngọt ngào và đáng nhớ nhất trong cuộc đời. Đây
              không chỉ là một buổi lễ, mà còn là dịp để gắn kết gia đình, bạn
              bè, và tất cả những người đã đồng hành cùng bọn mình.
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Intro;
