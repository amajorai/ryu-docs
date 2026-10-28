import { expect, test } from "bun:test";

const userGuide = new URL(
  "../../content/docs/surfaces/desktop/user-guide/appearance.mdx",
  import.meta.url,
);
const agentEditor = new URL(
  "../../../../packages/blocks/src/desktop/agent-edit.tsx",
  import.meta.url,
);
const runHistoryView = new URL(
  "../../../desktop/src/components/agents/AgentRunHistoryView.tsx",
  import.meta.url,
);

function sentenceAbout(text: string, phrase: string): string {
  const flat = text.replace(/\s+/g, " ");
  const sentences = flat.split(/(?<=[.!?])\s+/);
  const found = sentences.find((sentence) => sentence.includes(phrase));
  if (!found) {
    throw new Error(`No sentence mentions ${phrase}`);
  }
  return found;
}

test("the routine overview sentence names the controls the agent editor really has", async () => {
  const [guide, editorSource, viewSource] = await Promise.all([
    Bun.file(userGuide).text(),
    Bun.file(agentEditor).text(),
    Bun.file(runHistoryView).text(),
  ]);

  // The words the guide uses must be the labels the editor ships: the parent
  // tab is "Activity" and the view inside it is "Run history".
  expect(editorSource).toContain('label: "Activity"');
  expect(editorSource).toMatch(/id: "history",\s*label: "Run history"/);
  expect(editorSource).not.toContain('label: "History"');
  // The overview is drawn only for an agent that has at least one routine.
  expect(viewSource).toMatch(/routines\.length > 0 \? <AgentRunOverview/);

  const sentence = sentenceAbout(guide, "Window ending");
  expect(sentence).toContain("**Run history** view");
  expect(sentence).toContain("Activity tab");
  expect(sentence).toContain("has routines");
  expect(sentence).toContain("same time zone");
  expect(guide).not.toContain("History tab");
});
