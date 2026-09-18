import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/glass/page";

import { Feedback } from "@/components/feedback/client";
import { FeedbackText } from "@/components/feedback/text";
import {
  submitDocsBlockFeedback,
  submitDocsFeedback,
} from "@/lib/docs-feedback";

export default function ProofPage() {
  return (
    <main className="min-h-screen bg-fd-background text-fd-foreground">
      <DocsPage className="mx-auto max-w-3xl px-6 py-16">
        <DocsTitle>Fumadocs integration proof</DocsTitle>
        <DocsDescription>
          Select a sentence to open the block-level feedback popover.
        </DocsDescription>
        <DocsBody>
          <FeedbackText onSendAction={submitDocsBlockFeedback}>
            <p
              id="proof-block"
              data-block="feedback"
              className="rounded-xl bg-fd-muted/50 p-4"
            >
              Ryu Docs can collect feedback on the exact paragraph a reader
              selects, including a short quote and its stable block identity.
            </p>
            <p>
              The page-level form below remains available when feedback is
              about the whole guide rather than one section.
            </p>
          </FeedbackText>
        </DocsBody>
        <Feedback onSendAction={submitDocsFeedback} />
      </DocsPage>
    </main>
  );
}
