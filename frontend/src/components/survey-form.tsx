"use client";

import { useState, useSyncExternalStore } from "react";

import { submitFeedback } from "@/lib/feedback";

const DONE_KEY = "recall-survey-done";

type Question = {
  name: "heard_from" | "visit_reason" | "wants_alerts";
  legend: string;
  options: [string, string][];
};

export const SURVEY_QUESTIONS: Question[] = [
  {
    name: "heard_from",
    legend: "How did you hear about ReCall?",
    options: [
      ["friend_or_family", "A friend or family member"],
      ["social_media", "Social media"],
      ["search", "A search engine"],
      ["other", "Somewhere else"],
    ],
  },
  {
    name: "visit_reason",
    legend: "What did you come to check?",
    options: [
      ["food_at_home", "Food I have at home"],
      ["brand_i_buy", "A brand I buy often"],
      ["in_the_news", "A recall I heard about in the news"],
      ["just_curious", "Nothing specific, just curious"],
    ],
  },
  {
    name: "wants_alerts",
    legend: "Would you use email alerts for foods you watch?",
    options: [
      ["yes", "Yes"],
      ["maybe", "Maybe"],
      ["no", "No"],
    ],
  },
];

type Answers = Partial<Record<Question["name"], string>>;

type FormState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done" }
  | { kind: "error"; message: string };

function readDone(): boolean {
  try {
    return window.localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}

const noopSubscribe = () => () => undefined;

/** A short anonymous questionnaire; answered once per device. */
export function SurveyForm() {
  const answeredBefore = useSyncExternalStore(noopSubscribe, readDone, () => false);
  const [answers, setAnswers] = useState<Answers>({});
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<FormState>({ kind: "idle" });

  if (state.kind === "done" || answeredBefore) {
    return (
      <div className="feedback-success" role="status">
        <strong>Thanks for helping shape ReCall!</strong>
        <p>Your answers help decide what gets built next.</p>
      </div>
    );
  }

  const answeredAny = Object.keys(answers).length > 0 || comment.trim().length > 0;

  return (
    <form
      className="feedback-form survey-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!answeredAny) {
          setState({ kind: "error", message: "Please answer at least one question." });
          return;
        }
        setState({ kind: "sending" });
        const result = await submitFeedback("/api/survey", {
          ...answers,
          ...(comment.trim() ? { comment: comment.trim() } : {}),
          website,
        });
        if (result.ok) {
          try {
            window.localStorage.setItem(DONE_KEY, "1");
          } catch {
            // Without storage the thank-you still shows for this visit.
          }
          setState({ kind: "done" });
        } else {
          setState({ kind: "error", message: result.error });
        }
      }}
    >
      {SURVEY_QUESTIONS.map((question) => (
        <fieldset className="survey-question" key={question.name}>
          <legend>{question.legend}</legend>
          <div className="survey-options">
            {question.options.map(([value, label]) => (
              <label className="survey-option" key={value}>
                <input
                  checked={answers[question.name] === value}
                  name={question.name}
                  onChange={() =>
                    setAnswers((current) => ({ ...current, [question.name]: value }))
                  }
                  type="radio"
                  value={value}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <label className="survey-comment" htmlFor="survey-comment">
        Anything that would make ReCall more useful? <span>(optional)</span>
      </label>
      <textarea
        id="survey-comment"
        maxLength={500}
        onChange={(event) => setComment(event.target.value)}
        rows={3}
        value={comment}
      />
      <label aria-hidden="true" className="feedback-trap">
        Website
        <input
          autoComplete="off"
          onChange={(event) => setWebsite(event.target.value)}
          tabIndex={-1}
          type="text"
          value={website}
        />
      </label>
      {state.kind === "error" ? (
        <p className="feedback-error" role="alert">
          {state.message}
        </p>
      ) : null}
      <button
        className="primary-button"
        disabled={state.kind === "sending"}
        type="submit"
      >
        {state.kind === "sending" ? "Sending…" : "Send answers"}
      </button>
    </form>
  );
}
