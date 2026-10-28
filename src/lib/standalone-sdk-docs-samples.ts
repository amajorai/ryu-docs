import { config } from "./standalone-sdk-docs-fixtures";

// Sample-shape helpers for the standalone SDK docs guard: result-mode
// misreads, print calls, and per-tab top-level names.
/** How the docs name each service in tables. */
export const SERVICE_TITLES: Record<string, string> = {
  box: "Box",
  connect: "Connect",
  gateway: "Gateway",
  mail: "Mail",
  managedAgents: "Managed Agents",
  messaging: "Messaging",
  notify: "Notify",
  passport: "Passport",
  sites: "Sites",
};

/** Links to internal `docs/*.md` files (the repository's private docs). */
export const INTERNAL_DOC_LINKS = [
  /\]\((?!https?:|mailto:|\/|#)[^)\s]*\bdocs\/[^)\s]*\.md(?:#[^)\s]*)?\)/,
  /href=["'](?!https?:|mailto:|\/|#)[^"'\s]*\bdocs\/[^"'\s]*\.md\b/,
  /(?:^|[\s(`'"])docs\/[\w./-]+\.md\b/m,
];

export const SERVICE_PAGES = Object.entries(config.SERVICE_DOC_SLUGS).map(
  ([service, slug]) => ({ service, file: `${slug}.mdx` }),
);

// ---------------------------------------------------------------------------
// Result-mode checks: a sample must be written for the mode its page's client
// uses. On an object-mode page every call resolves to `{ data, error, meta }`,
// so a reply field read straight off the result is always `undefined` (Node)
// or an AttributeError (Python).
// ---------------------------------------------------------------------------

/** The page builds its Node client with `result: "object"`. */
export const NODE_OBJECT_CLIENT = /\bnew Ryu\(\{\s*result:\s*"object"/;
/** The page builds its Python client (sync or async) with `result="object"`. */
export const PYTHON_OBJECT_CLIENT = /\b(?:Async)?Ryu\(result="object"\)/;
/** A fence that builds its own throw-mode client is checked as throw mode. */
export const OWN_THROW_CLIENT = /\bnew Ryu\(\)|\b(?:Async)?Ryu\(\)/;
/** What a result carries (`ok` and `unwrap()` exist on Python's `Result`). */
export const RESULT_MEMBERS: ReadonlySet<string> = new Set([
  "data",
  "error",
  "meta",
  "ok",
  "unwrap",
]);
/** Calls that return an iterator, not a result, in both modes. */
export const ITERATOR_CALL = /\.(?:iterate|stream|follow|pages)\(/;

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function memberMisreads(code: string, name: string): string[] {
  const misreads: string[] = [];
  // `(?<![.\\w])` so `ryu.box.create` or `data.quote.x` is not a use of `box` or `quote`.
  const use = new RegExp(
    `(?<![.\\w])${escapeRegExp(name)}(?:\\?\\.|\\.)(\\w+)|(?<![.\\w])${escapeRegExp(name)}\\[`,
    "g",
  );
  for (const match of code.matchAll(use)) {
    const member = match[1];
    if (member === undefined) {
      misreads.push(`${name}[...]`);
    } else if (!RESULT_MEMBERS.has(member)) {
      misreads.push(`${name}.${member}`);
    }
  }
  return misreads;
}

/** Reply fields a Node sample reads straight off an object-mode result. */
export function nodeResultMisreads(code: string): string[] {
  const misreads: string[] = [];
  const assigned =
    /\b(?:const|let)\s+(\w+)\s*=\s*await\s+ryu\.(?!safe\b)([^;\n]*)/g;
  for (const match of code.matchAll(assigned)) {
    const [, name = "", call = ""] = match;
    if (!ITERATOR_CALL.test(call)) {
      misreads.push(...memberMisreads(code, name));
    }
  }
  const inline = /\(await\s+ryu\.(?!safe\b)[^;\n]*?\)\)\??\.(\w+)/g;
  for (const match of code.matchAll(inline)) {
    const member = match[1] ?? "";
    if (!RESULT_MEMBERS.has(member)) {
      misreads.push(`(await ...).${member}`);
    }
  }
  return misreads;
}

/** The rest of a Python statement from `start`: to the first newline outside brackets. */
export function statementFrom(code: string, start: number): string {
  let depth = 0;
  let end = start;
  while (end < code.length) {
    const char = code[end];
    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
    } else if (char === ")" || char === "]" || char === "}") {
      depth -= 1;
    } else if (char === "\n" && depth <= 0) {
      break;
    }
    end += 1;
  }
  return code.slice(start, end);
}

/** Reply fields a Python sample reads straight off an object-mode `Result`. */
export function pythonResultMisreads(code: string): string[] {
  const misreads: string[] = [];
  const assigned = /^\s*(\w+)\s*=\s*(?:await\s+)?ryu\.(?!safe\b)/gm;
  for (const match of code.matchAll(assigned)) {
    const name = match[1] ?? "";
    const call = statementFrom(code, (match.index ?? 0) + match[0].length);
    const unwrapped = /\)\s*\.(?:data|unwrap\(\))\s*$/.test(call);
    if (!(ITERATOR_CALL.test(call) || unwrapped)) {
      misreads.push(...memberMisreads(code, name));
    }
  }
  const inline = /\bryu\.(?!safe\b)[\w.]+\([^()\n]*\)(?:\[|\.get\()/g;
  for (const match of code.matchAll(inline)) {
    misreads.push(match[0]);
  }
  return misreads;
}

/** `contextlib.aclosing()` around something that is not an async generator. */
export function acloseProblems(code: string): string[] {
  const problems: string[] = [];
  for (const match of code.matchAll(/\baclosing\(([^\n]*)/g)) {
    const argument = match[1] ?? "";
    if (!/\.(?:stream|follow)\(/.test(argument)) {
      problems.push(`aclosing(${argument.trim()}`);
    }
  }
  return problems;
}

export const PRINT_CALL = /\b(?:console\.(?:error|log|warn)|print)\(/g;
export const WEBHOOK_VERIFY_CALL = /\bverify(?:Mail|Notify|Messaging)Webhook\(/;
export const THREE_TUPLE = /^\s*(\w+), (\w+), (\w+) = (?:await )?([\w.]+)\(/;

/**
 * Every console.error/log/warn or print call in a fence, from its name to the
 * matching close paren, so a print split over several lines reads as one.
 */
export function printCalls(body: string): string[] {
  const calls: string[] = [];
  for (const match of body.matchAll(PRINT_CALL)) {
    let depth = 0;
    let end = match.index + match[0].length - 1;
    for (; end < body.length; end += 1) {
      if (body[end] === "(") {
        depth += 1;
      } else if (body[end] === ")") {
        depth -= 1;
        if (depth === 0) {
          break;
        }
      }
    }
    calls.push(body.slice(match.index, end + 1));
  }
  return calls;
}

/**
 * A print that shows `.message` (which ends with the hint) and `.hint` too.
 * `error.hint ?? error.message` (or Python's `or`) prints one of them, so
 * that fallback is not a duplicate.
 */
export function printsMessageAndHint(call: string): boolean {
  const withoutFallbacks = call.replace(
    /\.hint\s*(?:\?\?|\|\||\bor\b)\s*[\w.]+\.message\b/g,
    "",
  );
  return (
    /\.message\b/.test(withoutFallbacks) && /\.hint\b/.test(withoutFallbacks)
  );
}

/**
 * Why a Python fence's reuse of `_` fails mypy --strict: `_` bound to two
 * different tuple slots, or to the data slot (0) of two different calls,
 * which return different Result types. The meta slot (2) always holds
 * `ResponseMeta | None`, so reusing `_` there is fine.
 */
export function underscoreConflict(body: string): string | null {
  const slots = new Set<number>();
  const dataTargets = new Set<string>();
  for (const line of body.split("\n")) {
    const match = THREE_TUPLE.exec(line);
    if (!match) {
      continue;
    }
    for (const [slot, name] of match.slice(1, 4).entries()) {
      if (name === "_") {
        slots.add(slot);
      }
    }
    if (match[1] === "_" && match[4]) {
      dataTargets.add(match[4]);
    }
  }
  if (slots.size > 1) {
    return "slots";
  }
  if (dataTargets.size > 1) {
    return `data slot: ${[...dataTargets].join(", ")}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Audit 4: Sites gate and data paths, Python callouts, Box walkthrough
// ---------------------------------------------------------------------------

/** Bodies of the fences whose info string ends in `tab="<tab>"`, in order. */
export function tabBodies(content: string, tab: "Node" | "Python"): string[] {
  const pattern = new RegExp(
    String.raw`^\`\`\`\S+ tab="${tab}"\n([\s\S]*?)^\`\`\`\s*$`,
    "gm",
  );
  return [...content.matchAll(pattern)].map((match) => match[1] ?? "");
}

/** Top-level `const`/`let` names, destructured renames included. */
export function nodeTopLevelNames(body: string): Set<string> {
  const names = new Set<string>();
  for (const match of body.matchAll(/^(?:const|let) (\w+)\b/gm)) {
    names.add(match[1] ?? "");
  }
  for (const match of body.matchAll(/^(?:const|let) \{([^}]*)\}/gm)) {
    for (const part of (match[1] ?? "").split(",")) {
      const name = part.split(":").at(-1)?.trim();
      if (name) {
        names.add(name);
      }
    }
  }
  return names;
}

/** Names bound by a top-level `a, b, c = ...` unpacking (a Result triple). */
export function pythonTripleNames(body: string): Set<string> {
  const names = new Set<string>();
  for (const match of body.matchAll(/^(\w+), (\w+), (\w+) = /gm)) {
    for (const name of match.slice(1)) {
      if (name && name !== "_") {
        names.add(name);
      }
    }
  }
  return names;
}

/** Names that more than one fence of the list declares. */
export function redeclared(
  bodies: string[],
  collect: (body: string) => Set<string>,
) {
  const seen = new Map<string, number>();
  for (const body of bodies) {
    for (const name of collect(body)) {
      seen.set(name, (seen.get(name) ?? 0) + 1);
    }
  }
  return [...seen].filter(([, count]) => count > 1).map(([name]) => name);
}

/** Quickstarts whose samples read as one script, top to bottom. */
export const ONE_SCRIPT_PAGES = [
  "notify.mdx",
  "box.mdx",
  "sites.mdx",
  "connect.mdx",
  "passport.mdx",
  "messaging.mdx",
];
