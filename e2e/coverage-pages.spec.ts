import path from "node:path";
import { expect, test } from "@playwright/test";

const origin = "http://127.0.0.1:5489";
const proofDirectory = process.env.RYU_FUMADOCS_COVERAGE_PROOF_DIR ?? "";
if (!proofDirectory || !path.isAbsolute(proofDirectory)) {
  throw new Error(
    "RYU_FUMADOCS_COVERAGE_PROOF_DIR must be a fresh absolute directory",
  );
}

const guides = [
  {
    slug: "surfaces/cli/tui",
    title: "OpenTUI terminal client",
    root: "CLI",
    link: "Desktop parity",
    destination: "Desktop parity",
    prose: [
      "For a separate CLI state directory, set RYU_CLI_CONFIG_DIR to an absolute directory path before launching the TUI.",
      "Core data and account authentication keep their own configuration.",
      "An empty or relative path is rejected.",
    ],
  },
  {
    slug: "plugins/chat-title",
    title: "Chat Title",
    root: "Plugins",
    link: "Plugins catalog",
    destination: "Plugins",
    prose: [
      "A saved title and its title-history entry are committed together.",
      "previous title and history remain unchanged",
      "Automatic naming preserves a title you chose manually.",
    ],
  },
  {
    slug: "plugins/agent-comms",
    title: "Switchboard",
    root: "Plugins",
    link: "Plugins catalog",
    destination: "Plugins",
    prose: [
      "If that save fails, the messages remain queued for a later turn.",
      "Concurrent messages are preserved when delivery or invalid-inbox cleanup loses its storage comparison.",
      "This is local queue handling, not a guarantee that another agent completed the work.",
    ],
    inlineCode: "{ok, agents:[{id, name, description, model, engine}], count}",
  },
  {
    slug: "apps/approvals",
    title: "Approvals",
    root: "Apps",
    link: "Apps catalog",
    destination: "Apps",
    prose: [
      "While a decision is waiting for acknowledgement, both decision controls on that row stay disabled.",
      "You can review another row without submitting the pending decision again.",
      "Approving an inbox item does not grant a missing configuration permission.",
      "Allow once authorizes the current call and asks again for a later call.",
      "Allow for session reuses the grant only within that session's permission scope.",
    ],
  },
  {
    slug: "apps/calendar",
    title: "Calendar",
    root: "Apps",
    link: "Apps catalog",
    destination: "Apps",
    prose: [
      "If creation is refused, the dialog keeps your selected agent, schedule and approval choice for review and retry.",
      "If either readback fails, Calendar shows Try again; use it to reload the acknowledged routine and workflow labels for existing workflow-target jobs. Do not submit the creation again.",
      "To choose whether its routine starts a new transcript or reuses a persistent chat, use Triggers → Routines on the agent’s edit page.",
    ],
  },
  {
    slug: "apps/mail",
    title: "Mail",
    root: "Apps",
    link: "Apps catalog",
    destination: "Apps",
    prose: [
      "Reusing a completed key with the same inbox and message returns its recorded response without another transport handoff, even if the transport is subsequently unconfigured.",
      "Local preflight refusals, such as an unconfigured transport or invalid recipient address, do not consume a retry key.",
      "Unresolved keys are retained across restarts rather than automatically retried.",
    ],
  },
  {
    slug: "apps/outreach",
    title: "Outreach",
    root: "Apps",
    link: "Apps catalog",
    destination: "Apps",
    prose: [
      "Outreach reuses the saved identifier so Mail can replay a recorded result.",
      "Changing the draft or inbox cannot bypass an unresolved send.",
      "Unresolved send identifiers remain attached to their recipients across reloads.",
    ],
  },
  {
    slug: "apps/invoices",
    title: "Invoices",
    root: "Apps",
    link: "Apps catalog",
    destination: "Apps",
    prose: [
      "Due, overdue, and collected amounts are grouped by invoice currency.",
      "Each group shows its currency code",
      "Invoices does not convert currencies or combine them into a single total.",
      "Failed saves keep the last confirmed records and show an error.",
    ],
  },
  {
    slug: "apps/finetune",
    title: "Fine-tuning",
    root: "Apps",
    link: "Apps catalog",
    destination: "Apps",
    prose: [
      "retrying the unchanged configuration reuses its idempotency key",
      "Completed, failed, and cancelled runs show no remaining-time estimate.",
      "Failed runs retain the worker error for review.",
    ],
  },
  {
    slug: "mobile/native-surfaces",
    title: "Native OS surfaces",
    root: "Mobile",
    link: "Mobile tools and privacy",
    destination: "Tools & privacy",
    prose: [
      "Saved node additions and selections take effect after local storage accepts the change.",
      "The AI Keyboard settings screen keeps the last saved configuration visible if a local save fails.",
      "It does not replace saved preferences with defaults after a failed read.",
    ],
  },
  {
    slug: "surfaces/desktop/bot",
    title: "Bot",
    root: "Desktop App",
    link: "Privacy and Telemetry",
    destination: "Privacy and Telemetry",
    prose: [
      "If the workspace cannot confirm the setting, Bot stays on the entry screen with an error",
      "A failed confirmation does not replace your saved choice.",
      "A pending confirmation from a previous workspace cannot open chat on that workspace.",
    ],
  },
] as const;

for (const guide of guides) {
  test(`${guide.title}: hydrated navigation and recovery contract`, async ({
    page,
  }) => {
    const browserErrors: string[] = [];
    const unexpectedOrigins: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (
        (url.protocol === "http:" || url.protocol === "https:") &&
        url.origin !== origin
      ) {
        unexpectedOrigins.push(url.origin);
        await route.abort();
        return;
      }
      await route.continue();
    });

    await page.goto(`/docs/${guide.slug}`);
    await expect(
      page.getByRole("heading", { level: 1, name: guide.title, exact: true }),
    ).toBeVisible();
    const sidebar = page.locator("#nd-sidebar");
    await expect(sidebar).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: guide.title, exact: true }).first(),
    ).toBeVisible();
    // This controlled Radix popover only opens after the production layout hydrates.
    await sidebar
      .getByRole("button", { name: guide.root, exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: "Mobile", exact: true }).last(),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    const article = page.locator("[data-fd-full] > .prose");
    await expect(article).toHaveCount(1);
    for (const prose of guide.prose) await expect(article).toContainText(prose);
    if ("inlineCode" in guide) {
      const code = article.locator("code");
      await expect(
        code.filter({ hasText: guide.inlineCode }).first(),
      ).toHaveText(guide.inlineCode);
      for (const codeText of await code.allTextContents()) {
        expect(codeText).not.toContain("&#123;");
        expect(codeText).not.toContain("&#125;");
      }
    }
    // A guide may cite the same related page more than once; every link with
    // this name must agree on one public docs destination before following it.
    const guideLinks = article.getByRole("link", {
      name: guide.link,
      exact: true,
    });
    await expect(guideLinks.first()).toBeVisible();
    const guideHrefs = await guideLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    );
    expect(guideHrefs.length).toBeGreaterThan(0);
    for (const href of guideHrefs) expect(href).toMatch(/\/docs\//);
    expect(new Set(guideHrefs).size).toBe(1);
    await guideLinks.first().click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: guide.destination,
        exact: true,
      }),
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole("heading", { level: 1, name: guide.title, exact: true }),
    ).toBeVisible();
    for (const prose of guide.prose) await expect(article).toContainText(prose);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({
      path: path.join(proofDirectory, `${guide.slug.replaceAll("/", "-")}.png`),
      fullPage: true,
    });
    expect(unexpectedOrigins).toEqual([]);
    expect(browserErrors).toEqual([]);
  });
}
