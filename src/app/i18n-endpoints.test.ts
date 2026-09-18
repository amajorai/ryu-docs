import { describe, expect, test } from "bun:test";
import { GET as markdown } from "./llms.mdx/docs/[[...slug]]/route";
import { GET as index } from "./llms.txt/route";
import { GET as section } from "./llms-sections/[section]/route";

describe("locale-aware documentation projections", () => {
  test("serves the localized page tree from llms.txt", async () => {
    const response = index(
      new Request("http://localhost:4010/llms.txt?locale=es"),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("# Documentación");
    expect(body).toContain("/es/docs/0.4.0/start-here");
  });

  test("filters localized section projections by the same page URL contract", async () => {
    const response = await section(
      new Request("http://localhost:4010/llms-sections/start-here?locale=es"),
      { params: Promise.resolve({ section: "start-here" }) },
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("Locale: es");
    expect(body).toContain(
      "Source: https://docs.ryuhq.com/es/docs/0.4.0/start-here",
    );
  });

  test("resolves a localized processed Markdown page", async () => {
    const response = await markdown(
      new Request("http://localhost:4010/llms.mdx/docs/es/0.4.0/start-here"),
      {
        params: Promise.resolve({
          slug: ["es", "0.4.0", "start-here"],
        }),
      },
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain(
      "Source: https://docs.ryuhq.com/es/docs/0.4.0/start-here",
    );
    expect(body).toContain("Comienza aquí");
  });

  test("rejects an unsupported endpoint locale", async () => {
    const response = index(
      new Request("http://localhost:4010/llms.txt?locale=xx"),
    );

    expect(response.status).toBe(400);
  });
});
