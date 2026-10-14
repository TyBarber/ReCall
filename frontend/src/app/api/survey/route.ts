import { forwardFeedback } from "@/lib/api/feedback";

/** Saves an anonymous questionnaire response. */
export function POST(request: Request) {
  return forwardFeedback(request, {
    path: "/survey/responses",
    invalidMessage: "Please answer at least one question.",
  });
}
