import type { ReactNode } from "react";
import styles from "./realm-alpha-badge.module.css";

const ALPHA_REALMS = new Set(["roadmap"]);

export function isAlphaRealm(segment: string): boolean {
  return ALPHA_REALMS.has(segment);
}

export function AlphaBadge(): ReactNode {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-realm-alpha/15 px-1.5 py-0.5 font-medium  uppercase tracking-wide text-realm-alpha-foreground ring-1 ring-realm-alpha/30 ring-inset ${styles.label}`}
      title="Early preview. APIs and UX may change"
    >
      Alpha
    </span>
  );
}

export function realmTabTitle(title: ReactNode, segment: string): ReactNode {
  if (!isAlphaRealm(segment)) {
    return title;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {title}
      <AlphaBadge />
    </span>
  );
}
