import { createRoot } from "react-dom/client";
import styles from "./proof.module.css";

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
    <li className={styles.role0}>
      <div className={styles.role1}>
        <strong className={styles.role2}>{label}</strong>
        <span className={styles.role3}>{value}</span>
      </div>
      <p className={styles.role4}>{detail}</p>
    </li>
  );
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.role5}>
      <span className={styles.role6}>{label}</span>
      <code className={styles.role7}>{value}</code>
    </div>
  );
}

function SeoProof() {
  return (
    <main className={styles.role8}>
      <div className={styles.role9}>
        <header>
          <div className={styles.role10}>
            <div aria-hidden="true" className={styles.role11}>
              ✦
            </div>
            <div>
              <div className={styles.role12}>
                RYU DOCS · VERIFICATION ARTIFACT
              </div>
              <h1 className={styles.role13}>Fumadocs SEO + Last Modified</h1>
            </div>
          </div>
          <p className={styles.role14}>
            Production output is wired end to end: content timestamps flow into
            Fumadocs UI, page metadata, and the sitemap without a moving “now”
            value.
          </p>
        </header>

        <section aria-label="Verification status" className={styles.role15}>
          <div className={styles.role16}>
            <h2 className={styles.role17}>6/6 checks passed</h2>
            <span className={styles.role18}>BUILD VERIFIED</span>
          </div>
          <ul className={styles.role19}>
            {checks.map((check) => (
              <CheckCard key={check.label} {...check} />
            ))}
          </ul>
        </section>

        <section aria-label="Live evidence" className={styles.role20}>
          <h2 className={styles.role21}>Live evidence</h2>
          <p className={styles.role22}>
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

        <footer className={styles.role23}>
          <span className={styles.role24}>Passed:</span> fumadocs types:check ·
          focused Biome · Next production build · browser DOM · browser console
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
