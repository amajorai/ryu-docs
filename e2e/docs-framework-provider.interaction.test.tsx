import { afterEach, expect, mock, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { Root } from "fumadocs-core/page-tree";

GlobalRegistrator.register();
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  configurable: true,
  value: true,
  writable: true,
});

let nextPathname = "/en/docs/0.4.0/surfaces/desktop/bot";
mock.module("next/navigation", () => ({
  usePathname: () => nextPathname,
  useParams: () => ({ lang: "en" }),
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));

const { act } = await import("react");
const { hydrateRoot } = await import("react-dom/client");
const { renderToString } = await import("react-dom/server");
const { usePathname } = await import("fumadocs-core/framework");
const { TreeContextProvider, useTreeContext } = await import(
  "fumadocs-ui/contexts/tree"
);
const { getLayoutTabs, isLayoutTabActive } = await import(
  "fumadocs-ui/layouts/shared"
);
const { DocsFrameworkProvider } = await import(
  "../src/components/docs-framework-provider"
);
const { normalizeDocsNavigationPathname } = await import(
  "../src/lib/docs-version"
);

function pageTree(prefix = ""): Root {
  return {
    name: "Docs",
    children: [
      {
        type: "folder",
        name: "Start Here",
        root: true,
        index: {
          type: "page",
          name: "Introduction",
          url: `${prefix}/docs/0.4.0/start`,
        },
        children: [
          {
            type: "page",
            name: "Introduction",
            url: `${prefix}/docs/0.4.0/start`,
          },
        ],
      },
      {
        type: "folder",
        name: "Surfaces",
        root: true,
        index: {
          type: "page",
          name: "Surfaces",
          url: `${prefix}/docs/0.4.0/surfaces`,
        },
        children: [
          {
            type: "folder",
            name: "Desktop App",
            root: true,
            index: {
              type: "page",
              name: "Agent",
              url: `${prefix}/docs/0.4.0/surfaces/desktop`,
            },
            children: [
              {
                type: "page",
                name: "Desktop Bot",
                url: `${prefix}/docs/0.4.0/surfaces/desktop/bot`,
              },
            ],
          },
          {
            type: "page",
            name: "CLI parity",
            url: `${prefix}/docs/0.4.0/surfaces/cli/parity`,
          },
        ],
      },
    ],
  };
}

function SidebarSelection({ tree }: { tree: Root }) {
  const pathname = usePathname();
  const { root } = useTreeContext();
  const selected = getLayoutTabs(tree).findLast((tab) =>
    isLayoutTabActive(tab, pathname),
  );
  return (
    <section>
      <h2>{selected?.title ?? "Layout Tab"}</h2>
      <p>{root.name}</p>
      <output>{pathname}</output>
    </section>
  );
}

function Sidebar({ tree }: { tree: Root }) {
  return (
    <DocsFrameworkProvider>
      <TreeContextProvider tree={tree}>
        <SidebarSelection tree={tree} />
      </TreeContextProvider>
    </DocsFrameworkProvider>
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

test("rewritten English SSR hydrates the same real sidebar root and follows navigation", async () => {
  const tree = pageTree();
  for (const surface of ["desktop/bot", "cli/parity"]) {
    const selectedRoot = surface === "desktop/bot" ? "Desktop App" : "Surfaces";
    nextPathname = `/en/docs/0.4.0/surfaces/${surface}`;
    const serverMarkup = renderToString(<Sidebar tree={tree} />);
    expect(serverMarkup).toContain(
      `<h2>${selectedRoot}</h2><p>${selectedRoot}</p>`,
    );
    expect(serverMarkup).not.toContain("Layout Tab");

    const container = document.createElement("div");
    container.innerHTML = serverMarkup;
    document.body.append(container);
    nextPathname = `/docs/0.4.0/surfaces/${surface}`;
    const recoverableErrors: unknown[] = [];
    const hydrated = hydrateRoot(container, <Sidebar tree={tree} />, {
      onRecoverableError: (error) => recoverableErrors.push(error),
    });
    try {
      await act(async () => {
        await Promise.resolve();
      });
      expect(recoverableErrors).toEqual([]);
      expect(container.innerHTML).toBe(serverMarkup);

      nextPathname = "/docs/0.4.0/start";
      await act(async () => hydrated.render(<Sidebar tree={tree} />));
      expect(container.querySelector("h2")?.textContent).toBe("Start Here");
      expect(container.querySelector("p")?.textContent).toBe("Start Here");
    } finally {
      await act(async () => hydrated.unmount());
      container.remove();
    }
  }
});

test("visible locale and versionless aliases select the real localized tree", () => {
  for (const locale of ["ar", "fr"]) {
    const tree = pageTree(`/${locale}`);
    nextPathname = `/${locale}/docs/surfaces/cli/parity`;
    const alias = renderToString(<Sidebar tree={tree} />);
    nextPathname = `/${locale}/docs/0.4.0/surfaces/cli/parity`;
    expect(renderToString(<Sidebar tree={tree} />)).toBe(alias);
    expect(alias).toContain("<h2>Surfaces</h2><p>Surfaces</p>");
    expect(alias).toContain(`/${locale}/docs/0.4.0/surfaces/cli/parity`);
  }
  nextPathname = "/en/docs/surfaces/desktop/bot";
  expect(renderToString(<Sidebar tree={pageTree()} />)).toContain(
    "/docs/0.4.0/surfaces/desktop/bot",
  );
});

test("normalization leaves unrelated and historical-version route contracts intact", () => {
  for (const path of ["/en/account", "/english/docs", "/docs/0.3.0/start"]) {
    expect(normalizeDocsNavigationPathname(path)).toBe(path);
  }
  expect(normalizeDocsNavigationPathname("/en/docs/0.3.0/start")).toBe(
    "/docs/0.3.0/start",
  );
});
