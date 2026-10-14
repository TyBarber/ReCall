import { forwardFeedback } from "@/lib/api/feedback";

/** Adds an email to the alerts interest list. */
export function POST(request: Request) {
  return forwardFeedback(request, {
    path: "/alerts/signups",
    invalidMessage: "Please enter a valid email address.",
  });
}
