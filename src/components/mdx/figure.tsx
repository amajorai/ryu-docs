import Image from "next/image";

import { DOCS_FIGURES } from "@/components/mdx/docs-figures.generated";

/*
 * An Anatomy-style isometric drawing from scripts/figures/docs/<name>.mjs,
 * rendered by `bun run generate:figures` into public/figures/docs/. Decorative:
 * the figure carries no text (no number, title or caption), so the surrounding
 * prose and headings carry the meaning and the images are hidden from assistive
 * technology. Both themes ship as separate files and CSS shows the one that
 * matches the page.
 */
export function Figure({ name }: { name: string }) {
  const size = DOCS_FIGURES[name];
  if (!size) {
    throw new Error(
      `Unknown docs figure "${name}". Add scripts/figures/docs/${name}.mjs and run \`bun run generate:figures\`.`,
    );
  }
  return (
    <div aria-hidden="true" className="not-prose mx-auto my-8 max-w-2xl">
      <Image
        alt=""
        className="h-auto w-full dark:hidden"
        height={size.height}
        src={`/figures/docs/${name}-light.svg`}
        unoptimized
        width={size.width}
      />
      <Image
        alt=""
        className="hidden h-auto w-full dark:block"
        height={size.height}
        src={`/figures/docs/${name}-dark.svg`}
        unoptimized
        width={size.width}
      />
    </div>
  );
}
