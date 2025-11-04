import { EVENT } from "@/app/rsvp/event";
import InfoCards from "../rsvp/components/InfoCards";
import Schedule from "../rsvp/components/Schedule";
import Contact from "../rsvp/components/Contact";
import RSVPCard from "../rsvp/components/RSVPCard";

export const metadata = {
  title: "RSVP | Wedding",
  description:
    "Hẹn gặp bạn tại ngày vui của tụi mình! Vui lòng RSVP để tụi mình chuẩn bị chu đáo nhé.",
  openGraph: {
    title: "RSVP | Wedding",
    description:
      "Hẹn gặp bạn tại ngày vui của tụi mình! Vui lòng RSVP để tụi mình chuẩn bị chu đáo nhé.",
    type: "website",
  },
};

export default function RSVPPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-[#faf7f5] to-white text-neutral-800">
      <section className="relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="mx-auto max-w-6xl h-32 blur-[70px] bg-gradient-to-r from-rose-200/50 via-amber-200/40 to-sky-200/50 rounded-b-full" />
        </div>
        <div className="max-w-6xl mx-auto px-6 pt-14 pb-8">
          <p className="text-sm tracking-widest text-neutral-500 uppercase">
            We’re getting married
          </p>
          <h1 className="mt-2 text-4xl md:text-5xl font-semibold">
            Đăng ký tham dự
          </h1>
          <p className="mt-3 text-neutral-600 max-w-2xl">
            Rất mong được đón bạn trong ngày vui của tụi mình. Vui lòng điền
            thông tin RSVP để tụi mình sắp xếp chỗ ngồi, thực đơn và đón tiếp
            chu đáo nhé 💐
          </p>
        </div>
      </section>

      {/* CONTENT GRID */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-10">
            <InfoCards />
            <Schedule />
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="lg:sticky lg:top-6">
              <RSVPCard />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
