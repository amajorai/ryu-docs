"use client";

import {
  ApprovalCard,
  type ApprovalCardAnswers,
  type ApprovalCardQuestion,
  type ApprovalCardStatus,
} from "@ryu/ui/components/agents/approval-card";
import { Button } from "@ryu/ui/components/button";
import { Check, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * A single multiple-choice question. `answer` is the zero-based index of the
 * correct option. `explain` is shown after the learner answers, regardless of
 * whether they got it right, so the quiz teaches rather than just grades.
 */
export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
};

function questionId(index: number) {
  return `quiz-question-${index}`;
}

/** Map the Academy's content shape onto the shared ApprovalCard question API. */
export function toApprovalCardQuestions(
  questions: readonly QuizQuestion[],
): ApprovalCardQuestion[] {
  return questions.map((question, index) => ({
    id: questionId(index),
    title: question.q,
    options: question.options.map((option, optionIndex) => ({
      label: option,
      value: String(optionIndex),
    })),
    autoAdvance: false,
  }));
}

function selectedIndex(
  answers: ApprovalCardAnswers,
  index: number,
): number | null {
  const value = answers[questionId(index)]?.selected[0];
  if (value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function scoreQuiz(
  questions: readonly QuizQuestion[],
  answers: ApprovalCardAnswers,
) {
  return questions.reduce(
    (score, question, index) =>
      score + (selectedIndex(answers, index) === question.answer ? 1 : 0),
    0,
  );
}

function answeredCount(
  questions: readonly QuizQuestion[],
  answers: ApprovalCardAnswers,
) {
  return questions.reduce(
    (count, _question, index) =>
      count + (selectedIndex(answers, index) === null ? 0 : 1),
    0,
  );
}

function QuizReview({
  answers,
  onReset,
  questions,
}: {
  answers: ApprovalCardAnswers;
  onReset: () => void;
  questions: readonly QuizQuestion[];
}) {
  const correctCount = scoreQuiz(questions, answers);

  return (
    <div
      aria-live="polite"
      className="mt-4 rounded-xl bg-fd-background p-4 sm:p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 className="m-0 font-medium text-fd-card-foreground text-sm">
            Review your answers
          </h4>
          <p className="mt-1 mb-0 text-fd-muted-foreground text-xs">
            You got {correctCount} of {questions.length}. Re-read anything you
            missed before moving on.
          </p>
        </div>
        <Button onClick={onReset} size="sm" type="button" variant="ghost">
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Try again
        </Button>
      </div>

      <ol className="m-0 list-none space-y-4 p-0">
        {questions.map((question, index) => {
          const selected = selectedIndex(answers, index);
          const isCorrect = selected === question.answer;
          const selectedLabel =
            selected === null
              ? "No answer"
              : (question.options[selected] ?? "Unknown answer");

          return (
            <li
              className="m-0 flex items-start gap-2.5"
              key={questionId(index)}
            >
              <span
                aria-hidden="true"
                className={
                  isCorrect
                    ? "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-status-success"
                    : "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-status-destructive"
                }
              >
                {isCorrect ? (
                  <Check className="size-3.5" />
                ) : (
                  <X className="size-3.5" />
                )}
              </span>
              <div className="min-w-0 space-y-1 text-sm">
                <p className="m-0 font-medium text-fd-card-foreground break-words">
                  {index + 1}. {question.q}
                </p>
                <p className="m-0 text-fd-muted-foreground break-words">
                  Correct answer: {question.options[question.answer]}
                </p>
                {!isCorrect && (
                  <p className="m-0 text-fd-muted-foreground break-words">
                    Your answer: {selectedLabel}
                  </p>
                )}
                {question.explain && (
                  <p className="m-0 text-fd-muted-foreground break-words">
                    {question.explain}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * An interactive knowledge check for Academy lessons. It is a recognition-level
 * complement to the open reflection prompts each lesson already carries, not a
 * replacement for them. Scoring stays soft on purpose: the value is the reveal
 * and the explanation, in keeping with the Academy's "no grading, just be honest
 * with yourself" framing.
 */
export function Quiz({ questions }: { questions: readonly QuizQuestion[] }) {
  const approvalQuestions = useMemo(
    () => toApprovalCardQuestions(questions),
    [questions],
  );
  const [answers, setAnswers] = useState<ApprovalCardAnswers>({});
  const [status, setStatus] = useState<ApprovalCardStatus>("pending");
  const [step, setStep] = useState(0);
  const answered = answeredCount(questions, answers);
  const submitted = status === "answered";
  const correctCount = scoreQuiz(questions, answers);

  const reset = () => {
    setAnswers({});
    setStatus("pending");
    setStep(0);
  };

  const submit = (nextAnswers: ApprovalCardAnswers) => {
    setAnswers(nextAnswers);
    setStatus("answered");
  };

  return (
    <section
      aria-label="Knowledge check quiz"
      className="not-prose my-6 rounded-2xl bg-fd-secondary p-4 sm:p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="m-0 font-medium text-fd-card-foreground text-sm">
            Check yourself
          </p>
          <p className="mt-1 mb-0 text-fd-muted-foreground text-xs">
            Answer each question, then review the explanations.
          </p>
        </div>
        <span
          aria-live="polite"
          className="shrink-0 text-fd-muted-foreground text-xs tabular-nums"
        >
          {answered} / {questions.length} answered
        </span>
      </div>

      {questions.length === 0 ? (
        <p className="m-0 text-fd-muted-foreground text-sm">
          This lesson does not have a knowledge check yet.
        </p>
      ) : (
        <>
          <ApprovalCard
            answers={answers}
            className="bg-fd-background"
            onAnswersChange={setAnswers}
            onStepChange={setStep}
            onSubmit={submit}
            questions={submitted ? [] : approvalQuestions}
            result={`You got ${correctCount} of ${questions.length}. Review the explanations below.`}
            status={status}
            step={step}
            submitLabel="Finish check"
            title={submitted ? "Knowledge check complete" : "Check yourself"}
          />
          {submitted && (
            <QuizReview
              answers={answers}
              onReset={reset}
              questions={questions}
            />
          )}
        </>
      )}
    </section>
  );
}
