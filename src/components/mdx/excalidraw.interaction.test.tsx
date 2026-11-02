import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// The DOM must exist before react-dom/client loads, so React is imported after
// registering happy-dom and unregistered afterwards for the other test files.
beforeAll(() => {
  GlobalRegistrator.register({ url: "https://docs.example/en/docs/diagrams" });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
    writable: true,
  });
});
afterAll(async () => {
  await GlobalRegistrator.unregister();
});

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

async function renderDiagram({ strict = false } = {}) {
  const { act, StrictMode } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { Excalidraw } = await import("./excalidraw");
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const diagram = (
    <Excalidraw
      alt="Desktop calls Core"
      height="162"
      src="/diagrams/flow.excalidraw.svg"
      width="412"
    />
  );
  await act(async () => {
    root.render(strict ? <StrictMode>{diagram}</StrictMode> : diagram);
  });
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  const trigger = container.querySelector("button");
  if (!trigger) throw new Error("No expand button rendered");
  return { act, trigger };
}

const dialog = () =>
  document.querySelector<HTMLDialogElement>(
    'dialog[aria-label="Expanded diagram view"]',
  );

test("clicking the diagram opens the shared lightbox with the diagram", async () => {
  const { act, trigger } = await renderDiagram();
  expect(trigger.getAttribute("aria-label")).toBe(
    "Expand diagram: Desktop calls Core",
  );
  expect(dialog()).toBeNull();

  trigger.focus();
  await act(async () => trigger.click());

  const opened = dialog();
  expect(opened?.open).toBe(true);
  const image = opened?.querySelector("img");
  expect(image?.getAttribute("src")).toBe("/diagrams/flow.excalidraw.svg");
  expect(image?.getAttribute("alt")).toBe("Desktop calls Core");
  const toolbar = [...(opened?.querySelectorAll("button") ?? [])].map(
    (button) => button.getAttribute("aria-label") ?? button.textContent,
  );
  expect(toolbar).toEqual([
    "Fit",
    "Zoom in",
    "Zoom out",
    "Close diagram viewer",
  ]);
});

test("zoom controls change the zoom readout", async () => {
  const { act, trigger } = await renderDiagram();
  await act(async () => trigger.click());
  const opened = dialog();
  const readout = () => opened?.querySelector(".tabular-nums")?.textContent;
  const button = (name: string) =>
    [...(opened?.querySelectorAll("button") ?? [])].find(
      (candidate) => candidate.textContent === name,
    );
  const fitted = readout();
  await act(async () => button("Zoom in")?.click());
  expect(readout()).not.toBe(fitted);
  await act(async () => button("Fit")?.click());
  expect(readout()).toBe(fitted);
});

test("Escape closes the lightbox and returns focus to the diagram", async () => {
  const { act, trigger } = await renderDiagram();
  trigger.focus();
  await act(async () => trigger.click());
  const opened = dialog();
  expect(opened).not.toBeNull();

  await act(async () => {
    opened?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }),
    );
  });

  expect(dialog()).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

test("the close button closes the lightbox and returns focus", async () => {
  const { act, trigger } = await renderDiagram();
  trigger.focus();
  await act(async () => trigger.click());
  const close = dialog()?.querySelector<HTMLButtonElement>(
    'button[aria-label="Close diagram viewer"]',
  );
  close?.focus();
  await act(async () => close?.click());

  expect(dialog()).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

test("closes the modal before restoring focus, so the page is not inert", async () => {
  // Browsers ignore focus() on content behind an open modal dialog. happy-dom
  // has no inertness, so record whether the dialog was still open at the call.
  const { act, trigger } = await renderDiagram();
  trigger.focus();
  await act(async () => trigger.click());
  const opened = dialog();
  const openAtFocus: boolean[] = [];
  const focus = trigger.focus.bind(trigger);
  trigger.focus = (options?: FocusOptions) => {
    openAtFocus.push(opened?.open ?? false);
    focus(options);
  };
  const close = opened?.querySelector<HTMLButtonElement>(
    'button[aria-label="Close diagram viewer"]',
  );
  await act(async () => close?.click());

  expect(openAtFocus).toEqual([false]);
  expect(document.activeElement).toBe(trigger);
});

test("stays open under StrictMode, whose effect replay closes and reopens the modal", async () => {
  // Next.js dev renders in StrictMode: the focus-return cleanup closes the
  // dialog and the replay shows it again, but the queued `close` event from
  // that replay still arrives and must not close the viewer.
  const { act, trigger } = await renderDiagram({ strict: true });
  trigger.focus();
  await act(async () => trigger.click());
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  expect(dialog()?.open).toBe(true);
});
