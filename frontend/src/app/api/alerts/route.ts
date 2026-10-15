import { forwardFeedback } from "@/lib/api/feedback";
import { sendSignupEmails } from "@/lib/email";

/** Adds an email to the alerts interest list. */
export function POST(request: Request) {
  const siteUrl = new URL(request.url).origin;
  return forwardFeedback(request, {
    path: "/alerts/signups",
    invalidMessage: "Please enter a valid email address.",
    async onSaved(submitted, saved) {
      // Only a first signup gets emails, so the form can't be used to send
      // repeated messages to someone else's address.
      if (saved.first_signup !== true) {
        return;
      }
      await sendSignupEmails({
        email: String(submitted.email).trim().toLowerCase(),
        watchTerms: Array.isArray(submitted.watch_terms)
          ? submitted.watch_terms.filter((term): term is string => typeof term === "string")
          : [],
        source: typeof submitted.source === "string" ? submitted.source : "how_it_works",
        siteUrl,
      });
    },
  });
}
