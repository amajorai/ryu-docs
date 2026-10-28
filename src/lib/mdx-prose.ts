/** Escape MDX prose braces without changing the contents of Markdown code spans. */
export function escapeMdxProseBraces(text: string): string {
  const normalized = text;
  const output: string[] = [];
  let proseStart = 0;
  let cursor = 0;

  while (cursor < normalized.length) {
    if (normalized[cursor] !== "`") {
      cursor += 1;
      continue;
    }

    let precedingSlashes = 0;
    for (
      let index = cursor - 1;
      index >= 0 && normalized[index] === "\\";
      index -= 1
    ) {
      precedingSlashes += 1;
    }
    if (precedingSlashes % 2 === 1) {
      cursor += 1;
      continue;
    }

    let runEnd = cursor + 1;
    while (normalized[runEnd] === "`") {
      runEnd += 1;
    }
    const delimiter = normalized.slice(cursor, runEnd);
    let closingStart = runEnd;
    let closingEnd = -1;

    while (closingStart < normalized.length) {
      const candidate = normalized.indexOf("`", closingStart);
      if (candidate === -1) {
        break;
      }

      let candidateEnd = candidate + 1;
      while (normalized[candidateEnd] === "`") {
        candidateEnd += 1;
      }
      if (candidateEnd - candidate === delimiter.length) {
        // Backslashes inside a CommonMark code span are literal. They cannot
        // escape an otherwise matching closing backtick run.
        closingStart = candidate;
        closingEnd = candidateEnd;
        break;
      }
      closingStart = candidateEnd;
    }

    if (closingEnd === -1) {
      cursor = runEnd;
      continue;
    }

    output.push(escapeBraces(normalized.slice(proseStart, cursor)));
    output.push(normalized.slice(cursor, closingEnd));
    cursor = closingEnd;
    proseStart = closingEnd;
  }

  output.push(escapeBraces(normalized.slice(proseStart)));
  return output.join("");
}

function escapeBraces(text: string): string {
  return text
    .replace(/\s*\u2014\s*/g, " - ")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;")
    // MDX reads `<name>` in prose as a JSX tag (for example `/scan/<domain>`).
    .replace(/</g, "&lt;");
}
