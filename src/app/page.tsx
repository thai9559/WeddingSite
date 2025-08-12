import Header from "./components/Header";
import { Hero } from "./components/Hero";
import { Intro } from "./components/Intro";
import { Approach } from "./components/Approach";
import { Cards } from "./components/Cards";
import { SiteFooter } from "./components/SiteFooter";

export default function Home() {
  return (
    <main className=" bg-white text-neutral-800">
      <Header />
      <Hero />
      <Intro />
      <Approach />
      <Cards />
      <SiteFooter />
    </main>
  );
}
