import { expect, test } from "bun:test";
import { describeMermaidChart } from "./mermaid-description";

test("describes flowcharts by their node and edge labels", () => {
  expect(
    describeMermaidChart(
      "flowchart LR\n  A[Desktop] -->|HTTP| B(Core)\n  B --> C{Gateway}\n  classDef x fill:#f9f",
    ),
  ).toBe("Flowchart: Desktop, Core, Gateway, HTTP");
});

test("describes sequence diagrams by their messages", () => {
  expect(
    describeMermaidChart(
      "sequenceDiagram\n  A->>B: Request token\n  B-->>A: Token",
    ),
  ).toBe("Sequence diagram: Request token, Token");
});

test("prefers accessible titles and descriptions from the source", () => {
  expect(
    describeMermaidChart(
      "stateDiagram-v2\n  accTitle: Lifecycle\n  accDescr: Jobs move from queued to done\n  [*] --> Queued",
    ),
  ).toBe("State diagram: Lifecycle. Jobs move from queued to done");
  expect(
    describeMermaidChart("---\ntitle: My Flow\n---\nflowchart TD\n A-->B"),
  ).toBe("Flowchart: My Flow");
});

test("strips markup from labels and handles escaped newlines", () => {
  expect(
    describeMermaidChart('graph TD\\n  a["Hello <br/> world"] --> b'),
  ).toBe("Flowchart: Hello world");
});
