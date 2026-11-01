import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  GITHUB_SVGL,
  MOBILE_SVGL,
  OS_SVGL,
  type SvglSpec,
} from "@ryu/blocks/web/svgl-icon.tsx";

const PUBLIC_LOGOS = join(import.meta.dir, "../../public/logos");

const slugs = (spec: SvglSpec): string[] =>
  typeof spec === "string" ? [spec] : [spec.light, spec.dark];

describe("docs header download menu logos", () => {
  // SvglIcon loads `/logos/<slug>.svg` from the current origin, so the docs
  // site must serve every mark the shared download button and its menu draw.
  const specs: SvglSpec[] = [
    ...Object.values(OS_SVGL),
    ...Object.values(MOBILE_SVGL),
    GITHUB_SVGL,
  ];
  for (const slug of new Set(specs.flatMap(slugs))) {
    test(`serves /logos/${slug}.svg`, () => {
      expect(existsSync(join(PUBLIC_LOGOS, `${slug}.svg`))).toBe(true);
    });
  }
});
