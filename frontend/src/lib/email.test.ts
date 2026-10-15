import { afterEach, describe, expect, it, vi } from "vitest";

const { createTransport, sendMail } = vi.hoisted(() => {
  const sendMail = vi.fn(async (message: { to: string; from?: string }) => {
    void message;
    return {};
  });
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) };
});
vi.mock("nodemailer", () => ({ default: { createTransport } }));

import {
  sendSignupEmails,
  sendSurveyEmail,
  signupNotice,
  signupThankYou,
  surveyNotice,
} from "@/lib/email";

const signup = {
  email: "ty@example.com",
  watchTerms: ["Jif", "<b>Salsa</b>"],
  source: "home",
  siteUrl: "https://recall.example",
};

describe("email templates", () => {
  it("thanks a new signup and says what happens next", () => {
    const message = signupThankYou(signup);

    expect(message.to).toBe("ty@example.com");
    expect(message.subject).toBe("You're on the ReCall alerts list");
    expect(message.text).toContain("we'll email you as soon as they are");
    expect(message.text).toContain("Jif, <b>Salsa</b>");
    expect(message.text).toContain("Didn't sign up?");
    expect(message.html).toContain("&lt;b&gt;Salsa&lt;/b&gt;");
    expect(message.html).not.toContain("<b>Salsa</b>");
  });

  it("tells the owner where a signup came from", () => {
    const message = signupNotice(signup, "owner@example.com");

    expect(message.to).toBe("owner@example.com");
    expect(message.subject).toBe("New ReCall alerts signup (home page)");
    expect(message.text).toContain("Email: ty@example.com");
  });

  it("writes questionnaire answers as readable labels", () => {
    const message = surveyNotice(
      { heard_from: "social_media", wants_alerts: "maybe" },
      "owner@example.com",
    );

    expect(message.text).toContain("How did you hear about ReCall?\n  Social media");
    expect(message.text).toContain("What did you come to check?\n  (skipped)");
    expect(message.text).toContain("Would you use email alerts for foods you watch?\n  Maybe");
  });
});

describe("sending", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    sendMail.mockClear();
  });

  it("skips email when Gmail is not configured", async () => {
    vi.stubEnv("GMAIL_USER", "");
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await sendSurveyEmail({ wants_alerts: "yes" });

    expect(sendMail).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("sends the thank-you and owner notice through Gmail", async () => {
    vi.stubEnv("GMAIL_USER", "recall@example.com");
    vi.stubEnv("GMAIL_APP_PASSWORD", "abcd efgh ijkl mnop");

    await sendSignupEmails(signup);

    expect(createTransport).toHaveBeenCalledWith({
      service: "gmail",
      auth: { user: "recall@example.com", pass: "abcdefghijklmnop" },
    });
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls.map(([message]) => message.to)).toEqual([
      "ty@example.com",
      "recall@example.com",
    ]);
    expect(sendMail.mock.calls[0][0].from).toBe("ReCall <recall@example.com>");
  });

  it("keeps sending when one email fails", async () => {
    vi.stubEnv("GMAIL_USER", "recall@example.com");
    vi.stubEnv("GMAIL_APP_PASSWORD", "secret");
    vi.stubEnv("FEEDBACK_NOTIFY_TO", "owner@example.com");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    sendMail.mockRejectedValueOnce(new Error("Gmail said no"));

    await expect(sendSignupEmails(signup)).resolves.toBeUndefined();

    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls[1][0].to).toBe("owner@example.com");
    expect(error).toHaveBeenCalledWith("ReCall email failed", expect.any(Error));
    error.mockRestore();
  });
});
