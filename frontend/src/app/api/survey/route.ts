import { forwardFeedback } from "@/lib/api/feedback";
import { sendSurveyEmail, type SurveyDetails } from "@/lib/email";

const FIELDS = ["heard_from", "visit_reason", "wants_alerts", "comment"] as const;

/** Saves an anonymous questionnaire response and emails it to the owner. */
export function POST(request: Request) {
  return forwardFeedback(request, {
    path: "/survey/responses",
    invalidMessage: "Please answer at least one question.",
    async onSaved(submitted) {
      const answers: SurveyDetails = {};
      for (const field of FIELDS) {
        if (typeof submitted[field] === "string") {
          answers[field] = submitted[field];
        }
      }
      await sendSurveyEmail(answers);
    },
  });
}
