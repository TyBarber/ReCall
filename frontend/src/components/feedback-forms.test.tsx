import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AlertSignupForm } from "@/components/alert-signup-form";
import { SurveyForm } from "@/components/survey-form";

describe("AlertSignupForm", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("sends the email with the device watchlist and confirms", async () => {
    window.localStorage.setItem(
      "recall-watchlist",
      JSON.stringify([{ term: "Jif", addedAt: "2026-10-01", lastSeenAt: "2026-10-01" }]),
    );
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<AlertSignupForm source="home" />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "ty@example.com" },
    });
    expect(screen.getByRole("checkbox")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Notify me" }));

    expect(await screen.findByText("You’re on the list.")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/alerts");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: "ty@example.com",
      watch_terms: ["Jif"],
      source: "home",
      website: "",
    });

    // The device remembers the signup, so neither form asks again.
    unmount();
    render(<AlertSignupForm source="how_it_works" />);
    expect(screen.getByText("You’re on the list.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
  });

  it("can leave the watchlist out and shows server errors", async () => {
    window.localStorage.setItem(
      "recall-watchlist",
      JSON.stringify([{ term: "Jif", addedAt: "2026-10-01", lastSeenAt: "2026-10-01" }]),
    );
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ error: "Please enter a valid email address." }, { status: 400 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<AlertSignupForm source="how_it_works" />);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Notify me" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please enter a valid email address.",
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).watch_terms).toEqual([]);
  });
});

describe("SurveyForm", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("requires an answer, sends only what was answered, and remembers it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<SurveyForm />);

    fireEvent.click(screen.getByRole("button", { name: "Send answers" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please answer at least one question.",
    );
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "Social media" }));
    fireEvent.click(screen.getByRole("radio", { name: "Maybe" }));
    fireEvent.change(screen.getByLabelText(/more useful/), {
      target: { value: " Baby formula " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send answers" }));

    expect(await screen.findByText("Thanks for helping shape ReCall!")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      heard_from: "social_media",
      wants_alerts: "maybe",
      comment: "Baby formula",
      website: "",
    });

    unmount();
    render(<SurveyForm />);
    expect(screen.getByText("Thanks for helping shape ReCall!")).toBeInTheDocument();
  });
});
