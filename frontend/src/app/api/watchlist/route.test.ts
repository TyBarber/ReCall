import { describe, expect, it, vi } from "vitest";

import { recallFixture } from "@/test/fixtures";

const { getRecalls } = vi.hoisted(() => ({ getRecalls: vi.fn() }));
vi.mock("@/lib/api/recalls", () => ({ getRecalls }));

import { POST } from "@/app/api/watchlist/route";

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/watchlist", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/watchlist", () => {
  it("returns the newest few matches per term with only the fields it needs", async () => {
    getRecalls.mockReset();
    getRecalls
      .mockResolvedValueOnce([recallFixture])
      .mockRejectedValueOnce(new Error("down"));

    const response = await post({ terms: ["Kerry", "cheese"] });
    const { results } = await response.json();

    expect(getRecalls).toHaveBeenCalledWith({ search: "Kerry", sort: "newest", limit: 3 });
    expect(results[0]).toEqual({
      term: "Kerry",
      recalls: [
        {
          id: recallFixture.id,
          product_name: recallFixture.product_name,
          classification: recallFixture.classification,
          record_type: recallFixture.record_type,
          reported_at: recallFixture.reported_at,
          recall_date: recallFixture.recall_date,
        },
      ],
    });
    expect(results[1]).toEqual({ term: "cheese", recalls: null });
  });

  it("rejects malformed or oversized requests", async () => {
    expect((await post("not json")).status).toBe(400);
    expect((await post({ terms: "Kerry" })).status).toBe(400);
    expect((await post({ terms: [""] })).status).toBe(400);
    expect((await post({ terms: Array(11).fill("x") })).status).toBe(400);
    expect((await post({ terms: ["x".repeat(81)] })).status).toBe(400);
  });
});
