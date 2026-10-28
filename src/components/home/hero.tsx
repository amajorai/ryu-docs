import { LocalizedLink as Link } from "@/components/localized-link";
import { AlphaBadge, isAlphaRealm } from "@/components/realm-alpha-badge";
import { docsPath } from "@/lib/docs-version";
import { HeroBackground } from "./hero-background";
import {
  landingHeadlineClass,
  landingSectionClass,
  landingSectionTitleClass,
  landingSubheadlineClass,
} from "./landing-styles";
import { REALMS, type Track } from "./realms";
import { SearchTrigger } from "./search-trigger";

export { DOCS_HOME_REALM_PATHS } from "./realms";

export const DOCS_HOME_COPY = {
  description:
    "Ryu connects models, agents, tools, memory, workflows, policies, and apps. Build and run AI agents without starting from scratch",
  title: "Universal integration layer for AI",
} as const;

type QuickLink = {
  id: string;
  label: string;
  href: string;
};

const QUICK_LINKS: QuickLink[] = [
  {
    id: "install",
    label: "Install",
    href: docsPath("start-here", "getting-started"),
  },
  {
    id: "architecture",
    label: "Architecture",
    href: docsPath("start-here", "architecture"),
  },
  { id: "cookbook", label: "Cookbook", href: docsPath("learn", "cookbook") },
  {
    id: "api",
    label: "API reference",
    href: docsPath("extend", "develop", "api-reference"),
  },
  { id: "security", label: "Security", href: docsPath("security") },
];

// The hero used to close with a strip of hardcoded document counts (API
// reference pages, documentation sections, architecture diagrams), and the
// search placeholder quoted the API-page figure a second time. Nothing in the build
// recomputed any of them, so every page added or removed made the landing page
// a little more wrong, silently. Counting the corpus for real is not worth a
// build step, and a stale count is worse than no count, so the claim is gone
// rather than automated. Do not reintroduce one by hand.

function QuickLinks() {
  return (
    <nav aria-label="Common destinations">
      <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {QUICK_LINKS.map((link) => (
          <li key={link.id}>
            <Link
              className="font-medium text-fd-muted-foreground text-sm underline-offset-4 transition-colors hover:text-fd-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
              href={link.href}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Fills the first viewport, starting under the transparent site header the way
 * the landing hero does, over the animated ASCII backdrop.
 */
export function Hero() {
  return (
    <section className="relative isolate -mt-(--site-header-height) flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 pt-(--site-header-height) pb-[24dvh] text-center">
      <HeroBackground />
      <h1 className={landingHeadlineClass}>{DOCS_HOME_COPY.title}</h1>
      <p className={`${landingSubheadlineClass} text-balance`}>
        {DOCS_HOME_COPY.description}
      </p>
      <div className="mt-10 flex w-full max-w-xl flex-col items-center gap-5">
        <SearchTrigger />
        <QuickLinks />
      </div>
    </section>
  );
}

const TRACK_TITLES: Record<Track, string> = {
  use: "Use",
  build: "Build",
};

/** Every docs section as a plain text index, one column per track. */
export function DocsIndex() {
  return (
    <section aria-labelledby="index-heading" className={landingSectionClass}>
      <h2 className={landingSectionTitleClass} id="index-heading">
        All documentation
      </h2>
      <div className="mt-12 grid gap-12 md:grid-cols-2">
        {(["use", "build"] as const).map((track) => (
          <nav aria-label={TRACK_TITLES[track]} key={track}>
            <p className="mb-3 font-medium text-fd-muted-foreground text-sm">
              {TRACK_TITLES[track]}
            </p>
            <ul className="grid gap-x-8 sm:grid-cols-2">
              {REALMS.filter((realm) => realm.track === track).map((realm) => (
                <li key={realm.slug}>
                  <Link
                    className="inline-flex items-center gap-2 py-1.5 text-fd-foreground text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
                    href={docsPath(realm.path ?? realm.slug)}
                  >
                    {realm.title}
                    {isAlphaRealm(realm.slug) ? <AlphaBadge /> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </section>
  );
}
