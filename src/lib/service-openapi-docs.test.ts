import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ALL_SPECS,
  API_SPECS,
  apiNavigation,
  cleanDescriptionAtWord,
  DEPLOYMENT_MARKER,
  deploymentNote,
  escapeMdxText,
  firstSentence,
  orphanedServiceEntries,
  overviewParagraphs,
  SERVICE_REFERENCES,
  SERVICE_SPECS,
  selectSpecs,
  serviceReferenceMeta,
} from "../../scripts/api-reference-specs";
import { OPENAPI_INPUTS, SERVICE_OPENAPI_INPUTS } from "./openapi";

// Guards the rendered standalone service API reference: the render-time
// server and the generator read the same inputs, and the generated pages under
// content/docs/standalone/sdk/reference/ match a fresh generator run. The
// vendoring checks against apps/web live in service-openapi-sync.test.ts, so
// this file still runs where the repository root is absent.

const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const referenceRoot = join(appRoot, "content/docs/standalone/sdk/reference");

interface ServiceDocument {
  info: { description: string };
  paths: Record<string, Record<string, Record<string, unknown>>>;
  webhooks?: Record<string, Record<string, Record<string, unknown>>>;
}

async function readServiceDocument(input: string): Promise<ServiceDocument> {
  return JSON.parse(
    await readFile(join(appRoot, input), "utf8"),
  ) as ServiceDocument;
}

const HTTP_METHODS = new Set([
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
  "trace",
]);

async function mdxFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await mdxFiles(path)));
    } else if (entry.name.endsWith(".mdx")) {
      files.push(path);
    }
  }
  return files;
}

function runGenerator(args: string[]) {
  return spawnSync("bun", ["./scripts/generate-docs.ts", ...args], {
    cwd: appRoot,
    encoding: "utf8",
  });
}

describe("service OpenAPI reference", () => {
  test("the render-time server reads exactly the generator's inputs", () => {
    expect<string[]>([...SERVICE_OPENAPI_INPUTS]).toEqual(
      SERVICE_SPECS.map((spec) => spec.input),
    );
    expect<string[]>([...OPENAPI_INPUTS]).toEqual(
      ALL_SPECS.map((spec) => spec.input),
    );
  });

  test("selects surfaces by id and the services group", () => {
    expect(selectSpecs(undefined)).toEqual([...ALL_SPECS]);
    expect(selectSpecs("services")).toEqual([...SERVICE_SPECS]);
    expect(selectSpecs("box").map((spec) => spec.out)).toEqual(["box"]);
    expect(selectSpecs("gateway")).toEqual([API_SPECS[0]]);
    expect(selectSpecs("nope")).toEqual([]);
  });

  test("rejects an unknown surface", () => {
    const result = runGenerator(["--check", "--surface=nope"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Usage: bun scripts/generate-docs.ts");
  });

  test("keeps Gateway and Core navigation text unchanged", () => {
    const gateway = API_SPECS[0];
    expect(gateway && apiNavigation(gateway, "health")).toContain(
      "This reference is part of the [API reference](/docs/extend/develop/api-reference) and the [Gateway API](",
    );
  });

  test("describes each service with the first sentence of its document", () => {
    expect(
      firstSentence(
        "Ryu Box runs workspaces. Every route takes a key.\n\n**More.**",
      ),
    ).toBe("Ryu Box runs workspaces.");
    expect(firstSentence("**Bold** lead without a stop")).toBe(
      "Bold lead without a stop",
    );
    for (const spec of SERVICE_SPECS) {
      expect(spec.title).toMatch(/^Ryu .+ reference$/);
      expect(spec.description.length).toBeGreaterThan(0);
      expect(spec.description.length).toBeLessThanOrEqual(160);
      // A whole sentence: never cut, never split mid-word.
      expect(spec.description).toMatch(/[.!?]$/);
    }
  });

  test("truncates service descriptions at a word boundary", () => {
    const long = `${"word ".repeat(40)}tail`;
    const cut = cleanDescriptionAtWord(long) ?? "";
    expect(cut.length).toBeLessThanOrEqual(160);
    expect(cut).toMatch(/ word…$/);
    expect(cleanDescriptionAtWord("short, enough")).toBe("short, enough");
    expect(cleanDescriptionAtWord("  ")).toBeUndefined();
  });

  test("hand-written descriptions only condense the document's first sentence", async () => {
    for (const service of SERVICE_REFERENCES) {
      if (!service.description) {
        continue;
      }
      const spec = SERVICE_SPECS.find((entry) => entry.out === service.id);
      const document = await readServiceDocument(spec?.input ?? "");
      const lead = firstSentence(document.info.description);
      // Needed only because the document's own sentence is too long.
      expect(lead.length).toBeGreaterThan(160);
      const words = (text: string) =>
        new Set(text.toLowerCase().match(/[\w-]+(?:\.[\w-]+)*/g) ?? []);
      const leadWords = words(lead);
      const extra = [...words(service.description)].filter(
        (word) => !leadWords.has(word),
      );
      expect({ service: service.id, extra }).toEqual({
        service: service.id,
        extra: [],
      });
    }
  });

  test("escapes MDX syntax outside inline code only", () => {
    expect(escapeMdxText("a {b} <c> `{d} <e>`")).toBe(
      "a \\{b\\} \\<c> `{d} <e>`",
    );
  });

  test("keeps overview words and splits long paragraphs between sentences", () => {
    const sentence = `${"x".repeat(250)}.`;
    const paragraphs = overviewParagraphs(
      `${sentence} ${sentence} ${sentence}\n\nNext \`a. b\` end.`,
    );
    expect(paragraphs).toEqual([
      `${sentence} ${sentence}`,
      sentence,
      "Next `a. b` end.",
    ]);
  });

  test("each service landing page carries its document's full description", async () => {
    for (const spec of SERVICE_SPECS) {
      const document = await readServiceDocument(spec.input);
      const landing = await readFile(
        join(referenceRoot, spec.out, "index.mdx"),
        "utf8",
      );
      const body = landing.split("## Browse by endpoint group")[0] ?? "";
      for (const paragraph of overviewParagraphs(document.info.description)) {
        expect(body).toContain(paragraph);
      }
    }
    // The availability caveats the public-content standard requires.
    const caveats: Record<string, string> = {
      "managed-agents": "off until an organization owner",
      notify: "The self-hosted service is not yet published.",
      connect: "not distributed for self-hosting yet",
      passport: "its source is not yet published",
      box: "early access and enabled per organization",
      sites: "there is no Ryu-hosted offer",
      mail: "There is no self-serve hosted Mail signup.",
    };
    for (const [service, caveat] of Object.entries(caveats)) {
      const landing = await readFile(
        join(referenceRoot, service, "index.mdx"),
        "utf8",
      );
      expect({ service, has: landing.includes(caveat) }).toEqual({
        service,
        has: true,
      });
    }
  });

  test("labels every operation only one deployment serves", async () => {
    let marked = 0;
    for (const spec of SERVICE_SPECS) {
      const document = await readServiceDocument(spec.input);
      const labels = new Map<string, string | undefined>();
      for (const [route, item] of Object.entries(document.paths)) {
        for (const [method, operation] of Object.entries(item)) {
          if (HTTP_METHODS.has(method)) {
            labels.set(
              JSON.stringify({ path: route, method }),
              operation[DEPLOYMENT_MARKER] === undefined
                ? undefined
                : deploymentNote(spec, { path: route, method }),
            );
          }
        }
      }
      for (const page of await mdxFiles(join(referenceRoot, spec.out))) {
        const content = await readFile(page, "utf8");
        const match = /operations=\{\[(\{[^}]*\})\]\}/.exec(content);
        if (!match?.[1]) {
          continue;
        }
        const key = JSON.stringify(JSON.parse(match[1]));
        expect(labels.has(key)).toBe(true);
        const label = labels.get(key);
        const hasLabel = / only\.\*\* /.test(content);
        if (label) {
          marked += 1;
          expect({ page, has: content.includes(label) }).toEqual({
            page,
            has: true,
          });
        } else {
          expect({ page, hasLabel }).toEqual({ page, hasLabel: false });
        }
      }
    }
    // mail.json marks 12 operations today; a document that drops the marker
    // everywhere should fail here rather than pass silently.
    expect(marked).toBeGreaterThan(0);
  });

  test("words both deployment labels and rejects unknown values", () => {
    const mail = SERVICE_SPECS.find((spec) => spec.out === "mail");
    if (!mail) {
      throw new Error("mail reference missing");
    }
    expect(
      deploymentNote(mail, {
        path: "/api/mail/domains/{id}/verify",
        method: "post",
      }),
    ).toBe(
      "**Hosted Mail only.** Self-hosted Mail does not serve this operation.",
    );
    expect(
      deploymentNote(mail, {
        path: "/api/mail/inboxes/{id}/rotate-secret",
        method: "post",
      }),
    ).toBe(
      "**Self-hosted Mail only.** Hosted Mail does not serve this operation.",
    );
    expect(
      deploymentNote(mail, { path: "/api/mail/inboxes", method: "get" }),
    ).toBeUndefined();
    const gateway = API_SPECS[0];
    expect(
      gateway && deploymentNote(gateway, { path: "/health", method: "get" }),
    ).toBeUndefined();
  });

  test("the reference folder holds exactly the current services", async () => {
    const entries = (await readdir(referenceRoot)).filter(
      (name) => !name.startsWith("."),
    );
    expect(entries.sort()).toEqual(
      [
        "index.mdx",
        "meta.json",
        ...SERVICE_REFERENCES.map((service) => service.id),
      ].sort(),
    );
    expect(orphanedServiceEntries(join(appRoot, "content/docs"))).toEqual([]);
  });

  test("finds orphaned service folders and stray files", () => {
    const contentRoot = mkdtempSync(join(tmpdir(), "ryu-service-orphans-"));
    try {
      const reference = join(contentRoot, "standalone/sdk/reference");
      for (const name of ["mail", "retired-service"]) {
        mkdirSync(join(reference, name), { recursive: true });
      }
      for (const name of ["index.mdx", "meta.json", "stray.mdx", ".lock"]) {
        writeFileSync(join(reference, name), "");
      }
      expect(orphanedServiceEntries(contentRoot)).toEqual([
        join("standalone/sdk/reference", "retired-service"),
        join("standalone/sdk/reference", "stray.mdx"),
      ]);
      expect(orphanedServiceEntries(join(contentRoot, "absent"))).toEqual([]);
    } finally {
      rmSync(contentRoot, { recursive: true, force: true });
    }
  });

  test("the generated pages match a fresh generator run", () => {
    const result = runGenerator(["--check", "--surface=services"]);
    expect({ status: result.status, stderr: result.stderr }).toEqual({
      status: 0,
      stderr: "",
    });
  });

  test("checking one service also checks the shared index and sidebar", () => {
    const result = runGenerator(["--check", "--surface=notify"]);
    expect({ status: result.status, stderr: result.stderr }).toEqual({
      status: 0,
      stderr: "",
    });
  });

  test("renders one page per operation and webhook of every service document", async () => {
    for (const spec of SERVICE_SPECS) {
      const document = await readServiceDocument(spec.input);
      const operations = [
        ...Object.values(document.paths),
        ...Object.values(document.webhooks ?? {}),
      ].flatMap((item) =>
        Object.keys(item).filter((key) => HTTP_METHODS.has(key)),
      );
      const pages = await mdxFiles(join(referenceRoot, spec.out));
      let rendered = 0;
      for (const page of pages) {
        const content = await readFile(page, "utf8");
        if (content.includes(`document=${JSON.stringify(spec.input)}`)) {
          rendered += 1;
        }
      }
      expect({ service: spec.out, rendered }).toEqual({
        service: spec.out,
        rendered: operations.length,
      });
    }
  });

  test("lists every service in the reference sidebar and on the OpenAPI page", async () => {
    const meta = JSON.parse(
      await readFile(join(referenceRoot, "meta.json"), "utf8"),
    ) as { pages: string[] };
    expect(meta.pages).toEqual([
      "index",
      ...SERVICE_REFERENCES.map((service) => service.id),
    ]);
    expect(await readFile(join(referenceRoot, "meta.json"), "utf8")).toBe(
      serviceReferenceMeta(),
    );
    const openapiPage = await readFile(
      join(appRoot, "content/docs/standalone/sdk/openapi.mdx"),
      "utf8",
    );
    expect(openapiPage).toContain("(/docs/standalone/sdk/reference)");
    for (const service of SERVICE_REFERENCES) {
      expect(openapiPage).toContain(
        `(/docs/standalone/sdk/reference/${service.id})`,
      );
    }
  });
});
