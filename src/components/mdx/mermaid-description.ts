/**
 * Text equivalent for a rendered Mermaid diagram. The diagram is shown as an
 * isolated SVG image, so assistive technology only sees its `alt` text; derive
 * that from the chart source instead of a generic "Mermaid diagram" label.
 */

const MAX_DESCRIPTION_LENGTH = 400;
const MAX_LABELS = 24;

const ACC_TITLE_RE = /^\s*(?:accTitle\s*:|title(?:\s*:|\s))\s*(.+?)\s*$/im;
const ACC_DESCR_RE = /^\s*accDescr\s*:\s*(.+?)\s*$/im;
const FRONTMATTER_RE = /^\s*---\n[\s\S]*?\n---\n/;
const COMMENT_RE = /^\s*%%/;
// Styling and directive lines carry CSS, not labels.
const DIRECTIVE_RE =
  /^\s*(?:%%|classDef\s|class\s|style\s|linkStyle\s|click\s|accTitle\s*:|accDescr\s*:|title(?:\s*:|\s))/;
const DIAGRAM_SUFFIX_RE = /-?(?:diagram|chart)(?:-beta|-v2)?$/i;
const CAMEL_BOUNDARY_RE = /([a-z])([A-Z])/g;
// `id[Label]`, `id(Label)`, `id{Label}`, `id((Label))`, `id>Label]`, quoted or not.
const NODE_LABEL_RE =
  /\b\w[\w-]*\s*(?:\[\[|\[\(|\(\(|\{\{|\[|\(|\{|>)\s*"?([^[\](){}|"\n]+?)"?\s*(?:\]\]|\)\]|\)\)|\}\}|\]|\)|\})/g;
// Edge labels: `-->|label|`.
const EDGE_LABEL_RE = /\|([^|\n]+)\|/g;
// Sequence/state/class messages: `A->>B: text`, `state: text`.
const MESSAGE_LABEL_RE = /^[^:\n%]*?(?:-|>|\w)\s*:\s*(.+?)\s*$/gm;
const WHITESPACE_RE = /\s+/g;
const MARKUP_RE = /<[^>]*>/g;

function cleanLabel(label: string): string {
  return label.replace(MARKUP_RE, " ").replace(WHITESPACE_RE, " ").trim();
}

function diagramKind(source: string): string {
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || COMMENT_RE.test(trimmed)) {
      continue;
    }
    const keyword = trimmed.split(WHITESPACE_RE)[0] ?? "";
    if (keyword === "graph" || keyword === "flowchart") {
      return "Flowchart";
    }
    const words = keyword
      .replace(DIAGRAM_SUFFIX_RE, "")
      .replace(CAMEL_BOUNDARY_RE, "$1 $2")
      .toLowerCase();
    if (!words) {
      break;
    }
    return `${words.charAt(0).toUpperCase()}${words.slice(1)} diagram`;
  }
  return "Diagram";
}

function collectLabels(chartSource: string): string[] {
  const source = chartSource
    .split("\n")
    .filter((line) => !DIRECTIVE_RE.test(line))
    .join("\n");
  const labels = new Set<string>();
  const add = (raw: string | undefined) => {
    const label = cleanLabel(raw ?? "");
    if (label && labels.size < MAX_LABELS) {
      labels.add(label);
    }
  };
  for (const match of source.matchAll(NODE_LABEL_RE)) {
    add(match[1]);
  }
  for (const match of source.matchAll(EDGE_LABEL_RE)) {
    add(match[1]);
  }
  for (const match of source.matchAll(MESSAGE_LABEL_RE)) {
    add(match[1]);
  }
  return [...labels];
}

function truncate(text: string): string {
  return text.length > MAX_DESCRIPTION_LENGTH
    ? `${text.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`
    : text;
}

/** Build alt text from accTitle/accDescr/title, or the diagram's own labels. */
export function describeMermaidChart(chart: string): string {
  const source = chart.replaceAll("\\n", "\n").replace(FRONTMATTER_RE, "");
  const frontmatterTitle = chart
    .replaceAll("\\n", "\n")
    .match(FRONTMATTER_RE)?.[0]
    .match(ACC_TITLE_RE)?.[1];
  const title = cleanLabel(
    source.match(ACC_TITLE_RE)?.[1] ?? frontmatterTitle ?? "",
  );
  const description = cleanLabel(source.match(ACC_DESCR_RE)?.[1] ?? "");
  const kind = diagramKind(source);
  if (title || description) {
    return truncate(
      [`${kind}${title ? `: ${title}` : ""}`, description]
        .filter(Boolean)
        .join(". "),
    );
  }
  const labels = collectLabels(source);
  return truncate(labels.length ? `${kind}: ${labels.join(", ")}` : kind);
}
