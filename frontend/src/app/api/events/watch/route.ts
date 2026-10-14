import { forwardFeedback } from "@/lib/api/feedback";

/** Counts a Watch click by where on the site it happened. */
export function POST(request: Request) {
  return forwardFeedback(request, {
    path: "/events/watch",
    invalidMessage: "Unknown placement.",
  });
}
