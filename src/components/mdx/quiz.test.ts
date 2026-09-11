import { expect, test } from "bun:test";

import { type QuizQuestion, scoreQuiz, toApprovalCardQuestions } from "./quiz";

const QUESTIONS: QuizQuestion[] = [
  {
    answer: 1,
    explain: "The explanation.",
    options: ["No", "Yes"],
    q: "Does this use the shared question primitive?",
  },
  {
    answer: 0,
    options: ["First", "Second"],
    q: "Which option is correct?",
  },
];

test("maps Academy questions to ApprovalCard's single-choice contract", () => {
  expect(toApprovalCardQuestions(QUESTIONS)).toEqual([
    {
      autoAdvance: false,
      id: "quiz-question-0",
      options: [
        { label: "No", value: "0" },
        { label: "Yes", value: "1" },
      ],
      title: "Does this use the shared question primitive?",
    },
    {
      autoAdvance: false,
      id: "quiz-question-1",
      options: [
        { label: "First", value: "0" },
        { label: "Second", value: "1" },
      ],
      title: "Which option is correct?",
    },
  ]);
});

test("scores completed and incomplete ApprovalCard answers", () => {
  expect(
    scoreQuiz(QUESTIONS, {
      "quiz-question-0": { selected: ["1"] },
      "quiz-question-1": { selected: ["0"] },
    }),
  ).toBe(2);
  expect(
    scoreQuiz(QUESTIONS, {
      "quiz-question-0": { selected: ["0"] },
    }),
  ).toBe(0);
});
