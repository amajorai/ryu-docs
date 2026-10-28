import { describe, expect, test } from "bun:test";

import {
  pagesUnderHeader,
  readMeta,
  readPage,
} from "./docs-navigation-helpers";

describe("docs navigation: split guides", () => {
  test("keeps long guides split under their existing sidebar sections", async () => {
    const sections = [
      {
        meta: "surfaces/desktop/user-guide/meta.json",
        header: "---Chat & agents---",
        nextHeader: "---Knowledge & tools---",
        pages: [
          "agents",
          "agent-avatars",
          "agent-passport-and-builder",
          "agent-observability-and-evals",
          "chat",
          "chat-basics",
          "chat-sessions",
          "chat-messages",
          "chat-turn-review",
          "chat-session-controls",
          "chat-sidebar-controls",
          "chat-composer-and-media",
          "git-workspace",
          "git-workspace-controls",
        ],
      },
      {
        meta: "gateway/meta.json",
        header: "---Configuration & Security---",
        nextHeader: "---Tools & Channels---",
        pages: [
          "configuration",
          "configuration-settings",
          "configuration-access",
          "configuration-operations",
          "configuration-api",
        ],
      },
      {
        meta: "gateway/meta.json",
        header: "---Tools & Channels---",
        nextHeader: "---Observability & Reliability---",
        pages: [
          "channels",
          "channel-setup",
          "channel-controls",
          "channel-routing",
        ],
      },
      {
        meta: "gateway/meta.json",
        header: "---Observability & Reliability---",
        nextHeader: "---Hosted Fleet---",
        pages: ["prompt-caching", "reliability"],
      },
      {
        meta: "core/meta.json",
        header: "---Operations---",
        nextHeader: "---Automation---",
        pages: ["observability", "observability-traces", "node-and-presence"],
      },
      {
        meta: "core/meta.json",
        header: "---Orchestration---",
        nextHeader: "---Tools & Catalogs---",
        pages: [
          "workflows",
          "workflow-triggers-and-history",
          "workflow-runs-and-api",
        ],
      },
      {
        meta: "standalone/meta.json",
        header: "---Ryu Connect---",
        nextHeader: "---Ryu Box---",
        pages: [
          "connect-api",
          "connect-api-triggers",
          "connect-api-trigger-events",
        ],
      },
      {
        meta: "surfaces/desktop/user-guide/meta.json",
        header: "---Knowledge & tools---",
        nextHeader: "---Store & marketplace---",
        pages: ["spaces-memory", "memory", "tools-and-connections"],
      },
      {
        meta: "surfaces/desktop/user-guide/meta.json",
        header: "---Store & marketplace---",
        nextHeader: "---Data---",
        pages: [
          "store",
          "store-installation",
          "marketplace",
          "marketplace-buying",
          "marketplace-publishing",
        ],
      },
      {
        meta: "security/meta.json",
        header: "---Identity & Access---",
        nextHeader: "---Secret Vault---",
        pages: [
          "authentication-and-pairing",
          "authentication-account",
          "authentication-devices",
          "authentication-mcp",
          "authentication-organizations",
          "authentication-tokens",
        ],
      },
      {
        meta: "extend/develop/sdk/meta.json",
        header: "---TypeScript SDK---",
        nextHeader: "---Agent protocols---",
        pages: ["runnables", "builders", "tooling"],
      },
    ];

    for (const section of sections) {
      const navigation = (await readMeta(section.meta)).pages ?? [];
      expect(
        pagesUnderHeader(navigation, section.header, section.nextHeader),
      ).toEqual(expect.arrayContaining(section.pages));
    }

    const compactGuides = [
      "surfaces/desktop/user-guide/chat.mdx",
      "surfaces/desktop/user-guide/chat-basics.mdx",
      "surfaces/desktop/user-guide/chat-sessions.mdx",
      "surfaces/desktop/user-guide/chat-messages.mdx",
      "surfaces/desktop/user-guide/chat-turn-review.mdx",
      "surfaces/desktop/user-guide/agents.mdx",
      "surfaces/desktop/user-guide/agent-avatars.mdx",
      "surfaces/desktop/user-guide/agent-passport-and-builder.mdx",
      "surfaces/desktop/user-guide/agent-observability-and-evals.mdx",
      "surfaces/desktop/user-guide/chat-session-controls.mdx",
      "surfaces/desktop/user-guide/chat-sidebar-controls.mdx",
      "surfaces/desktop/user-guide/chat-composer-and-media.mdx",
      "surfaces/desktop/user-guide/git-workspace.mdx",
      "surfaces/desktop/user-guide/git-workspace-controls.mdx",
      "core/observability.mdx",
      "core/observability-traces.mdx",
      "apps/video-studio.mdx",
      "apps/video-studio-editing.mdx",
      "apps/video-studio-generation.mdx",
      "apps/video-studio-transcription.mdx",
      "standalone/passport-fetch-api.mdx",
      "standalone/passport-mcp-api.mdx",
      "gateway/configuration.mdx",
      "gateway/configuration-settings.mdx",
      "gateway/configuration-access.mdx",
      "gateway/configuration-operations.mdx",
      "gateway/configuration-api.mdx",
      "gateway/prompt-caching.mdx",
      "gateway/channels.mdx",
      "gateway/channel-setup.mdx",
      "gateway/channel-controls.mdx",
      "gateway/channel-routing.mdx",
      "core/workflows.mdx",
      "core/workflow-triggers-and-history.mdx",
      "core/workflow-runs-and-api.mdx",
      "standalone/connect-api.mdx",
      "standalone/connect-api-routes.mdx",
      "standalone/connect-api-triggers.mdx",
      "standalone/connect-api-trigger-events.mdx",
      "surfaces/desktop/user-guide/store.mdx",
      "surfaces/desktop/user-guide/store-installation.mdx",
      "surfaces/desktop/user-guide/marketplace.mdx",
      "surfaces/desktop/user-guide/marketplace-buying.mdx",
      "surfaces/desktop/user-guide/marketplace-publishing.mdx",
      "security/authentication-and-pairing.mdx",
      "security/authentication-account.mdx",
      "security/authentication-devices.mdx",
      "security/authentication-mcp.mdx",
      "security/authentication-organizations.mdx",
      "security/authentication-tokens.mdx",
      "extend/develop/sdk/index.mdx",
      "extend/develop/sdk/runnables.mdx",
      "extend/develop/sdk/builders.mdx",
      "extend/develop/sdk/tooling.mdx",
    ];

    for (const guide of compactGuides) {
      const content = await readPage(guide);
      expect(content.split(/\r?\n/).length).toBeLessThan(500);
    }
  });
});
