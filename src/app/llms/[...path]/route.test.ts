import { expect, test } from "bun:test";

import { siteConfig } from "@/lib/metadata";
import { GET as rootIndex } from "../../llms.txt/route";
import { GET } from "./route";

function sectionIndex(pathname: string) {
  const url = new URL(pathname, "https://docs.example");
  const path = url.pathname.replace(/^\/llms\//u, "").split("/");
  return GET(new Request(url), { params: Promise.resolve({ path }) });
}

test("serves a folder index as Markdown", async () => {
  const response = await sectionIndex("/llms/start-here.txt");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe(
    "text/markdown; charset=utf-8",
  );
  const body = await response.text();
  expect(body.startsWith("# Ryu Docs: Start Here\n")).toBe(true);
  expect(body).toContain(`(${siteConfig.url}/llms.txt)`);
});

test("serves nested folder indexes linked from their parent", async () => {
  const response = await sectionIndex("/llms/surfaces/desktop.txt");
  expect(response.status).toBe(200);
  expect(await response.text()).toContain(
    `(${siteConfig.url}/llms/surfaces.txt)`,
  );
});

test("returns 404 for unknown folders, missing suffixes, and bad pages", async () => {
  for (const pathname of [
    "/llms/missing-section.txt",
    "/llms/start-here",
    "/llms/start-here.txt?page=0",
    "/llms/start-here.txt?page=two",
    "/llms/start-here.txt?page=2",
    "/llms/constructor.txt",
  ]) {
    await expect(sectionIndex(pathname)).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  }
});

test("the English root index is the compact index that links folder indexes", async () => {
  const response = rootIndex(new Request("https://docs.example/llms.txt"));
  const body = await response.text();
  expect(response.status).toBe(200);
  expect(body.startsWith("# Ryu Documentation\n")).toBe(true);
  expect(body.length).toBeLessThan(30_000);
  expect(body).toContain(`(${siteConfig.url}/llms/start-here.txt)`);
});
