"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

/** The centered fake-search button that opens the built-in command palette. */
export function SearchTrigger() {
  const { setOpenSearch } = useSearchContext();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const platform = navigator.userAgent || navigator.platform || "";
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(platform));
  }, []);

  return (
    // No aria-label: the visible text names the button, so speech users can
    // say what they see (an aria-label that differs fails WCAG 2.5.3).
    <button
      aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
      className="group flex w-full items-center gap-3 rounded-full border border-fd-border bg-fd-background/80 px-5 py-3.5 text-left backdrop-blur-md transition-colors hover:bg-fd-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
      onClick={() => setOpenSearch(true)}
      type="button"
    >
      <Search
        aria-hidden="true"
        className="size-5 shrink-0 text-fd-muted-foreground transition-colors group-hover:text-fd-foreground"
      />
      <span className="flex-1 text-base text-fd-muted-foreground">
        Search the documentation…
      </span>
      <kbd className="hidden shrink-0 items-center gap-1 rounded-md bg-fd-muted px-2 py-1 font-medium font-mono text-fd-muted-foreground text-xs sm:inline-flex">
        {isMac ? "⌘" : "Ctrl"} K
      </kbd>
    </button>
  );
}
