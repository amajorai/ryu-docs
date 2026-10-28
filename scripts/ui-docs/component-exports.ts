/** Export discovery: list the component-shaped named exports of a source module. */
import { COMPONENT_EXPORT_EXCLUSIONS } from "./catalog-data.ts";

function isComponentExport(name: string): boolean {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name) || /^[A-Z0-9_]+$/.test(name)) {
    return false;
  }
  return !COMPONENT_EXPORT_EXCLUSIONS.some((pattern) => pattern.test(name));
}

export function extractComponentExports(source: string): string[] {
  const names = new Set<string>();
  const declarationPattern =
    /\bexport\s+(?:(?:async)\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of source.matchAll(declarationPattern)) {
    const name = match[1];
    if (name && isComponentExport(name)) {
      names.add(name);
    }
  }

  const defaultPattern =
    /\bexport\s+default\s+(?:function|class)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of source.matchAll(defaultPattern)) {
    const name = match[1];
    if (name && isComponentExport(name)) {
      names.add(name);
    }
  }

  const listPattern = /\bexport\s*\{([\s\S]*?)\}(?:\s*from\s+[^;]+)?\s*;?/g;
  for (const match of source.matchAll(listPattern)) {
    const body = match[1] ?? "";
    for (const specifier of body.split(",")) {
      const name = specifier
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)
        .at(-1)
        ?.trim();
      if (name && isComponentExport(name)) {
        names.add(name);
      }
    }
  }

  return [...names].sort((left, right) => left.localeCompare(right));
}
