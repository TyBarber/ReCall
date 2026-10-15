import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { afterTasks, sendSignupEmails, sendSurveyEmail } = vi.hoisted(() => ({
  afterTasks: [] as (() => Promise<unknown>)[],
  sendSignupEmails: vi.fn(async () => undefined),
  sendSurveyEmail: vi.fn(async () => undefined),
}));
vi.mock("next/server", () => ({
  after: (task: () => Promise<unknown>) => afterTasks.push(task),
}));
vi.mock("@/lib/email", () => ({ sendSignupEmails, sendSurveyEmail }));

async function runAfterTasks() {
  await Promise.all(afterTasks.splice(0).map((task) => task()));
}

import { POST as postAlert } from "@/app/api/alerts/route";
import { POST as postWatch } from "@/app/api/events/watch/route";
import { POST as postSurvey } from "@/app/api/survey/route";

function request(body: unknown) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("feedback routes", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/");
    fetchMock.mockReset();
    sendSignupEmails.mockClear();
    sendSurveyEmail.mockClear();
    afterTasks.length = 0;
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("forwards an alert signup to the recall API without the bot trap", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 202 }));

    const response = await postAlert(
      request({ email: "ty@example.com", watch_terms: ["Jif"], website: "" }),
    );

    expect(response.status).toBe(202);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/alerts/signups");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: "ty@example.com",
      watch_terms: ["Jif"],
    });
  });

  it("emails a first-time signup and the owner after responding", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: "accepted", first_signup: true }, { status: 202 }),
    );

    const response = await postAlert(
      request({ email: " Ty@Example.com ", watch_terms: ["Jif", 3], source: "home" }),
    );
    expect(response.status).toBe(202);
    expect(sendSignupEmails).not.toHaveBeenCalled();

    await runAfterTasks();
    expect(sendSignupEmails).toHaveBeenCalledWith({
      email: "ty@example.com",
      watchTerms: ["Jif"],
      source: "home",
      siteUrl: "http://localhost",
    });
  });

  it("never re-sends emails for an address that already signed up", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: "accepted", first_signup: false }, { status: 202 }),
    );

    await postAlert(request({ email: "ty@example.com" }));
    await runAfterTasks();

    expect(sendSignupEmails).not.toHaveBeenCalled();
  });

  it("emails questionnaire answers to the owner", async () => {
    fetchMock.mockResolvedValue(Response.json({ status: "accepted" }, { status: 202 }));

    await postSurvey(
      request({ heard_from: "social_media", comment: "More brands", extra: 1 }),
    );
    await runAfterTasks();

    expect(sendSurveyEmail).toHaveBeenCalledWith({
      heard_from: "social_media",
      comment: "More brands",
    });
  });

  it("sends no emails when the API rejects a submission", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 422 }));

    await postSurvey(request({ heard_from: "billboard" }));
    await runAfterTasks();

    expect(afterTasks).toHaveLength(0);
    expect(sendSurveyEmail).not.toHaveBeenCalled();
  });

  it("quietly accepts bot submissions without saving them", async () => {
    const response = await postSurvey(request({ wants_alerts: "yes", website: "spam.biz" }));

    expect(response.status).toBe(202);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("turns backend validation errors into a readable message", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 422 }));

    const response = await postAlert(request({ email: "nope" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Please enter a valid email address.",
    });
  });

  it("reports an unavailable backend as a temporary failure", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 503 }));
    expect((await postWatch(request({ placement: "results" }))).status).toBe(502);

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect((await postWatch(request({ placement: "results" }))).status).toBe(502);
  });

  it("rejects malformed and oversized bodies before calling the API", async () => {
    expect((await postSurvey(request("not json"))).status).toBe(400);
    expect((await postSurvey(request(["a"]))).status).toBe(400);
    expect((await postSurvey(request({ comment: "x".repeat(5000) }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
