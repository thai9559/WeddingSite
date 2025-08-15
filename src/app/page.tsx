// src/app/page.tsx
import Header from "./components/Header";
import { Hero } from "./components/Hero";
import { Intro } from "./components/Intro";
import { Approach } from "./components/Approach";
import { Cards } from "./components/Cards";
import { SiteFooter } from "./components/SiteFooter";
import WeddingGallery from "./components/WeddingGallery";
import { makeWeddingData } from "./lib/wedding.mapper";
import { weddingInput } from "./data/wedding.data";

export default function Home() {
  const data = makeWeddingData(weddingInput);

  return (
    <main className="bg-white text-neutral-800">
      <Header />
      <Hero />
      <WeddingGallery data={data} />
      <Approach />
      {/* ⬇️ Thêm id để WeddingGallery cuộn tới */}
      <section id="album-cards" className="scroll-mt-24">
        <Cards />
      </section>
      <SiteFooter />
    </main>
  );
}
