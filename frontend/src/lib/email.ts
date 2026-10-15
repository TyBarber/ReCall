import nodemailer, { type Transporter } from "nodemailer";

import { SURVEY_QUESTIONS, surveyAnswerLabel } from "@/lib/survey";

/**
 * Sends ReCall's few emails through a Gmail account with Nodemailer.
 *
 * Configure in the hosting environment (never in the repo):
 *   GMAIL_USER          the sending address, e.g. recallproject01@gmail.com
 *   GMAIL_APP_PASSWORD  a Google "app password" for that account
 *   FEEDBACK_NOTIFY_TO  where signup and questionnaire notices go
 *                       (defaults to GMAIL_USER)
 *
 * Without GMAIL_USER and GMAIL_APP_PASSWORD, emails are skipped and a warning
 * is logged; submissions are still saved by the recall API either way.
 */

type MailConfig = { user: string; pass: string; notifyTo: string };

function mailConfig(): MailConfig | null {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) {
    return null;
  }
  return { user, pass, notifyTo: process.env.FEEDBACK_NOTIFY_TO?.trim() || user };
}

let cachedTransport: { key: string; transport: Transporter } | null = null;

function transportFor(config: MailConfig): Transporter {
  const key = `${config.user}:${config.pass}`;
  if (cachedTransport?.key !== key) {
    cachedTransport = {
      key,
      transport: nodemailer.createTransport({
        service: "gmail",
        auth: { user: config.user, pass: config.pass },
      }),
    };
  }
  return cachedTransport.transport;
}

type Message = { to: string; subject: string; text: string; html?: string };

async function send(message: Message, config: MailConfig): Promise<void> {
  await transportFor(config).sendMail({
    from: `ReCall <${config.user}>`,
    replyTo: config.user,
    ...message,
  });
}

/** Runs each email on its own so one failure never blocks the others. */
async function sendAll(build: (config: MailConfig) => Message[]): Promise<void> {
  const config = mailConfig();
  if (!config) {
    console.warn("ReCall email is not configured; skipping email.");
    return;
  }
  const results = await Promise.allSettled(
    build(config).map((message) => send(message, config)),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("ReCall email failed", result.reason);
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SOURCE_LABELS: Record<string, string> = {
  home: "home page",
  how_it_works: "How it works page",
};

export type SignupDetails = {
  email: string;
  watchTerms: string[];
  source: string;
  siteUrl: string;
};

export function signupThankYou({ email, watchTerms, siteUrl }: SignupDetails): Message {
  const watching =
    watchTerms.length > 0
      ? `When alerts launch, they can start with what you're watching: ${watchTerms.join(", ")}.`
      : null;
  const paragraphs = [
    "Hi,",
    "Thanks for letting us know you'd like email alerts from ReCall! They aren't ready yet, but you're on the list, and we'll email you as soon as they are.",
    watching,
    `Until then, your watchlist on ${siteUrl} shows any recalls that match what you watch.`,
    "— ReCall",
  ].filter((line): line is string => Boolean(line));
  const footer =
    "Didn't sign up? Just ignore this email and you won't hear from us. To be removed from the list, reply to this email.";

  return {
    to: email,
    subject: "You're on the ReCall alerts list",
    text: `${paragraphs.join("\n\n")}\n\n${footer}\n`,
    html: [
      ...paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`),
      `<p style="color:#5b544c;font-size:13px">${escapeHtml(footer)}</p>`,
    ].join("\n"),
  };
}

export function signupNotice(
  { email, watchTerms, source }: SignupDetails,
  notifyTo: string,
): Message {
  return {
    to: notifyTo,
    subject: `New ReCall alerts signup (${SOURCE_LABELS[source] ?? source})`,
    text: [
      "Someone joined the email alerts interest list.",
      "",
      `Email: ${email}`,
      `Signed up from: ${SOURCE_LABELS[source] ?? source}`,
      `Watching: ${watchTerms.length > 0 ? watchTerms.join(", ") : "(nothing shared)"}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n"),
  };
}

export type SurveyDetails = Partial<
  Record<"heard_from" | "visit_reason" | "wants_alerts" | "comment", string>
>;

export function surveyNotice(answers: SurveyDetails, notifyTo: string): Message {
  const lines = SURVEY_QUESTIONS.map(
    (question) =>
      `${question.legend}\n  ${
        answers[question.name]
          ? surveyAnswerLabel(question.name, answers[question.name] ?? "")
          : "(skipped)"
      }`,
  );
  return {
    to: notifyTo,
    subject: "New ReCall questionnaire response",
    text: [
      ...lines,
      `Anything that would make ReCall more useful?\n  ${answers.comment?.trim() || "(skipped)"}`,
      "",
      `Time: ${new Date().toISOString()}`,
    ].join("\n\n"),
  };
}

/** Thanks a first-time signup and tells the owner about it. */
export function sendSignupEmails(details: SignupDetails): Promise<void> {
  return sendAll((config) => [
    signupThankYou(details),
    signupNotice(details, config.notifyTo),
  ]);
}

/** Sends a questionnaire response to the owner. */
export function sendSurveyEmail(answers: SurveyDetails): Promise<void> {
  return sendAll((config) => [surveyNotice(answers, config.notifyTo)]);
}
