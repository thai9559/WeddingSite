import RSVPForm from "@/app/rsvp/rsvp-form";

export const metadata = { title: "RSVP | Wedding" };

export default function RSVPPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-800">
      <section className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-6">Đăng ký tham dự</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Điền thông tin để tụi mình chuẩn bị đón bạn chu đáo hơn nhé 💐
        </p>
        <RSVPForm />
      </section>
    </main>
  );
}
