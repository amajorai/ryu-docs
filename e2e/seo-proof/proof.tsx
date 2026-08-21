import { createRoot } from "react-dom/client";

const colors = {
  background: "#09090b",
  border: "#27272a",
  card: "#111113",
  cardRaised: "#18181b",
  green: "#86efac",
  muted: "#a1a1aa",
  text: "#f4f4f5",
  violet: "#c4b5fd",
};

const evidence = {
  articleModified: "2026-08-17T04:54:40.000Z",
  canonical: "https://docs.ryuhq.com/docs/0.1.15/apps",
  lastUpdated: "Last updated on 8/17/2026",
  page: "http://127.0.0.1:4000/docs/0.1.15/apps",
  sitemapLastmod: "2026-08-17T04:54:40.000Z",
};

const checks = [
  {
    detail: "Git-first timestamp with Docker-safe file-mtime fallback",
    label: "Last-modified source",
    value: "PASS · Fumadocs Date",
  },
  {
    detail: evidence.lastUpdated,
    label: "Visible page footer",
    value: "PASS · Hydrated UI",
  },
  {
    detail: "Title template, description, keywords, robots, and canonical link",
    label: "Next.js metadata",
    value: "PASS · Search-ready",
  },
  {
    detail: "Escaped TechArticle and BreadcrumbList JSON-LD in the page HTML",
    label: "Structured data",
    value: "PASS · Rich-result ready",
  },
  {
    detail: "Article modified time plus 1200×630 page preview",
    label: "OG + Twitter",
    value: "PASS · Social-ready",
  },
  {
    detail: evidence.sitemapLastmod,
    label: "Sitemap lastmod",
    value: "PASS · Matches page",
  },
];

function CheckCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <li
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        listStyle: "none",
        padding: 18,
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 10,
          justifyContent: "space-between",
        }}
      >
        <strong style={{ fontSize: 15 }}>{label}</strong>
        <span style={{ color: colors.green, fontSize: 12, fontWeight: 700 }}>
          {value}
        </span>
      </div>
      <p
        style={{
          color: colors.muted,
          fontSize: 13,
          lineHeight: 1.5,
          margin: "10px 0 0",
        }}
      >
        {detail}
      </p>
    </li>
  );
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        alignItems: "baseline",
        display: "grid",
        gap: 16,
        gridTemplateColumns: "150px minmax(0, 1fr)",
        padding: "11px 0",
      }}
    >
      <span style={{ color: colors.muted, fontSize: 12 }}>{label}</span>
      <code
        style={{ color: colors.text, fontSize: 12, overflowWrap: "anywhere" }}
      >
        {value}
      </code>
    </div>
  );
}

function SeoProof() {
  return (
    <main
      style={{
        boxSizing: "border-box",
        color: colors.text,
        fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        minHeight: "100vh",
        padding: "34px 24px 52px",
      }}
    >
      <div style={{ margin: "0 auto", maxWidth: 980 }}>
        <header>
          <div style={{ alignItems: "center", display: "flex", gap: 12 }}>
            <div
              aria-hidden="true"
              style={{
                alignItems: "center",
                background: "#2e1065",
                border: `1px solid ${colors.violet}`,
                borderRadius: 12,
                display: "flex",
                fontSize: 22,
                height: 44,
                justifyContent: "center",
                width: 44,
              }}
            >
              ✦
            </div>
            <div>
              <div
                style={{
                  color: colors.muted,
                  fontSize: 12,
                  letterSpacing: 1.1,
                }}
              >
                RYU DOCS · VERIFICATION ARTIFACT
              </div>
              <h1 style={{ fontSize: 30, margin: "4px 0 0" }}>
                Fumadocs SEO + Last Modified
              </h1>
            </div>
          </div>
          <p
            style={{
              color: colors.muted,
              fontSize: 16,
              lineHeight: 1.6,
              margin: "20px 0 24px",
              maxWidth: 760,
            }}
          >
            Production output is wired end to end: content timestamps flow into
            Fumadocs UI, page metadata, and the sitemap without a moving “now”
            value.
          </p>
        </header>

        <section
          aria-label="Verification status"
          style={{
            background: colors.cardRaised,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            marginBottom: 24,
            padding: 20,
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: 10,
              justifyContent: "space-between",
            }}
          >
            <h2 style={{ fontSize: 17, margin: 0 }}>6/6 checks passed</h2>
            <span
              style={{
                background: "#14532d",
                borderRadius: 999,
                color: colors.green,
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 10px",
              }}
            >
              BUILD VERIFIED
            </span>
          </div>
          <ul
            style={{ display: "grid", gap: 10, margin: "18px 0 0", padding: 0 }}
          >
            {checks.map((check) => (
              <CheckCard key={check.label} {...check} />
            ))}
          </ul>
        </section>

        <section
          aria-label="Live evidence"
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: "14px 20px",
          }}
        >
          <h2 style={{ fontSize: 17, margin: "3px 0 5px" }}>Live evidence</h2>
          <p style={{ color: colors.muted, fontSize: 13, margin: "0 0 8px" }}>
            Representative production route served by the built standalone
            server.
          </p>
          <EvidenceRow label="Page" value={evidence.page} />
          <EvidenceRow label="Canonical" value={evidence.canonical} />
          <EvidenceRow label="Modified" value={evidence.articleModified} />
          <EvidenceRow
            label="Sitemap lastmod"
            value={evidence.sitemapLastmod}
          />
        </section>

        <footer
          style={{
            color: colors.muted,
            fontSize: 12,
            lineHeight: 1.6,
            marginTop: 18,
          }}
        >
          <span style={{ color: colors.violet }}>Passed:</span> fumadocs
          types:check · focused Biome · Next production build · browser DOM ·
          browser console
        </footer>
      </div>
    </main>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Proof root element is missing");
}

createRoot(rootElement).render(<SeoProof />);
