"use client";

import { getWebMcpModelContext } from "@ryu/assistant-widget/webmcp-api";
import { useEffect } from "react";

/**
 * Registers the read-only docs WebMCP tools. The tool code downloads only in
 * browsers that expose a model context.
 */
export function WebMcpProvider() {
  useEffect(() => {
    const context = getWebMcpModelContext();
    if (!context) {
      return;
    }
    let disposed = false;
    let unregister: (() => void) | undefined;
    import("@/lib/webmcp-tools").then(
      ({ registerDocsWebMcpTools }) => {
        if (!disposed) {
          unregister = registerDocsWebMcpTools(context);
        }
      },
      // Optional agent tooling: a chunk that fails to load leaves the page as is.
      () => undefined,
    );
    return () => {
      disposed = true;
      unregister?.();
    };
  }, []);
  return null;
}
