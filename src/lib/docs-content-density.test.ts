import { expect, test } from "bun:test";

const docsRoot = new URL("../../content/docs/", import.meta.url);
const MAX_PROSE_PARAGRAPH_CHARS = 900;

type Finding = {
  chars: number;
  file: string;
  line: number;
};

function findLongParagraphs(content: string, file: string): Finding[] {
  const lines = content.split(/\r?\n/);
  const findings: Finding[] = [];
  let inFrontmatter = lines[0]?.trim() === "---";
  let inFence = false;
  let inQuizExpression = false;
  let paragraph: string[] = [];
  let paragraphLine = 0;

  const flush = () => {
    if (paragraph.length === 0) {
      return;
    }
    const chars = paragraph.join(" ").replace(/\s+/g, " ").trim().length;
    if (chars > MAX_PROSE_PARAGRAPH_CHARS) {
      findings.push({ chars, file, line: paragraphLine });
    }
    paragraph = [];
    paragraphLine = 0;
  };

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();

    if (inFrontmatter) {
      if (index > 0 && trimmed === "---") {
        inFrontmatter = false;
      }
      continue;
    }

    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      flush();
      continue;
    }
    if (inFence) {
      continue;
    }

    if (inQuizExpression) {
      if (trimmed.includes("/>") || trimmed.endsWith("/>")) {
        inQuizExpression = false;
      }
      continue;
    }
    if (trimmed.includes("questions={")) {
      flush();
      inQuizExpression = !trimmed.includes("/>");
      continue;
    }

    if (
      !trimmed ||
      /^#{1,6}\s/.test(trimmed) ||
      trimmed === "---" ||
      /^(?:[-*+] |\d+[.)] |\||<|>|import\s|export\s)/.test(trimmed)
    ) {
      flush();
      continue;
    }

    if (paragraphLine === 0) {
      paragraphLine = index + 1;
    }
    paragraph.push(trimmed);
  }
  flush();

  return findings;
}

test("keeps public prose paragraphs scannable", async () => {
  const findings: Finding[] = [];
  const glob = new Bun.Glob("**/*.mdx");

  for await (const file of glob.scan({ cwd: docsRoot.pathname })) {
    if (file.includes("extend/develop/api-reference/")) {
      continue;
    }
    const content = await Bun.file(new URL(file, docsRoot)).text();
    findings.push(...findLongParagraphs(content, file));
  }

  expect(findings).toEqual([]);
});
