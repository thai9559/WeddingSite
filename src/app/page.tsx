// src/app/page.tsx
import Header from "./components/Header";
import { Hero } from "./components/Hero";
import { Approach } from "./components/Approach";
import { Cards } from "./components/Cards";
import { SiteFooter } from "./components/SiteFooter";
import WeddingGallery from "./components/WeddingGallery";
import { makeWeddingData } from "./lib/wedding.mapper";
import { weddingInput } from "./data/wedding.data";
import Link from "next/link";

export default function Home() {
  const data = makeWeddingData(weddingInput);

  return (
    <main className="bg-white text-neutral-800">
      <Header />
      <Hero />
      <WeddingGallery data={data} />
      <div className="text-center my-8">
        <Link
          href="/rsvp"
          className="inline-block bg-black text-white px-6 py-3 rounded-xl hover:opacity-90"
        >
          Đăng ký tham dự 💌
        </Link>
      </div>
      <Approach />
      <section id="album-cards" className="scroll-mt-24">
        <Cards />
      </section>
      <SiteFooter />
    </main>
  );
}
