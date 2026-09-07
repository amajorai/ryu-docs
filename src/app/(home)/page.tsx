import { FeaturedRail, Hero, Realms } from "@/components/home/hero";
import { Products } from "@/components/home/products";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col pb-16">
      <Hero />
      <Products />
      <FeaturedRail />
      <Realms />
    </main>
  );
}
