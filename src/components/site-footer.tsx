import { MAIN_SITE_URL } from "@/lib/layout.shared";

/*
 * The landing footer (packages/blocks/src/web/footer.tsx) for the docs home: the
 * positioning line beside the same link columns, then the legal row, on the
 * landing's full-bleed footer shell. Links point at the main site except Docs.
 */

interface FooterLink {
  href: string;
  label: string;
}

const site = (path: string) => `${MAIN_SITE_URL}${path}`;

const FOOTER_COLUMNS: readonly {
  links: readonly FooterLink[];
  title: string;
}[] = [
  {
    title: "Products",
    links: [
      { href: site("/products/desktop"), label: "Ryu Desktop" },
      { href: site("/bot"), label: "Bot" },
      { href: site("/agent"), label: "Agent" },
      { href: site("/marketplace"), label: "Marketplace" },
      { href: site("/products"), label: "All products" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: site("/products/core"), label: "Ryu Core" },
      { href: site("/products/gateway"), label: "Ryu Gateway" },
      { href: site("/products/cloud"), label: "Ryu Cloud" },
      {
        href: site("/products/agents-as-a-service"),
        label: "Agents as a Service",
      },
      { href: site("/products/red-team"), label: "Red Teaming" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/docs", label: "Docs" },
      { href: site("/academy"), label: "Academy" },
      { href: site("/guides"), label: "Guides" },
      { href: site("/changelog"), label: "Changelog" },
      { href: site("/help"), label: "Help Center" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: site("/enterprise"), label: "Enterprise" },
      { href: site("/security"), label: "Security" },
      { href: site("/partners"), label: "Partners" },
      { href: site("/blog"), label: "Blog" },
    ],
  },
  {
    title: "Get started",
    links: [
      { href: site("/download"), label: "Download" },
      { href: site("/pricing"), label: "Pricing" },
      { href: site("/compare"), label: "Compare" },
      { href: site("/login"), label: "Sign in" },
    ],
  },
];

const LEGAL_LINKS: readonly FooterLink[] = [
  { href: site("/privacy"), label: "Privacy" },
  { href: site("/terms"), label: "Terms" },
  { href: site("/contact"), label: "Contact" },
  { href: site("/dpa"), label: "DPA" },
];

// Static so prerendered pages stay deterministic, as on the landing.
const COPYRIGHT_YEAR = 2026;

export function SiteFooter() {
  return (
    <footer className="pt-8 pb-16 md:pt-16">
      <div className="w-full px-6 md:px-10 lg:px-16">
        <div className="mb-12 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="hidden lg:block">
            <p className="max-w-sm text-balance font-heading font-medium text-2xl text-fd-foreground">
              Run agents with the tools and rules they need.
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5"
          >
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="mb-4 font-medium text-fd-foreground">
                  {column.title}
                </p>
                {column.links.map((link) => (
                  <a
                    className="block py-2.5 text-fd-muted-foreground text-sm transition-colors hover:text-fd-foreground md:py-1.5"
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-4 text-fd-muted-foreground text-sm md:mt-32">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-8">
            {LEGAL_LINKS.map((link) => (
              <a
                className="inline-flex min-h-10 items-center transition-colors hover:text-fd-foreground sm:min-h-0"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </a>
            ))}
          </div>
          <p>© {COPYRIGHT_YEAR} A Major Pte. Ltd., Singapore</p>
        </div>
      </div>
    </footer>
  );
}
