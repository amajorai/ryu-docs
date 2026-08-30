import {
  Integrations,
  OpenSource,
  Reach,
  RunItAnywhere,
  WorksWith,
} from "@/components/home/ecosystem";
import { FeaturedRail, Hero, Realms } from "@/components/home/hero";
import { PlatformMap } from "@/components/home/platform-map";
import { Products } from "@/components/home/products";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col pb-16">
      <Hero />
      <Products />
      <PlatformMap />
      <Realms />
      {/* Moved off the marketing landing page rather than dropped: model and
          skill counts, agent runtimes, MCP integrations, SPDX licences and
          self-host targets are what a developer evaluating Ryu wants, and the
          business site is read by someone who has no use for any of it. */}
      <Reach />
      <WorksWith />
      <Integrations />
      <RunItAnywhere />
      <OpenSource />
      <FeaturedRail />
    </main>
  );
}
