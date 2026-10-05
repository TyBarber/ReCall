import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getRecall,
  getRecallPage,
  getRecalls,
  isRecall,
} from "@/lib/api/recalls";
import { recallFixture } from "@/test/fixtures";

describe("recall API client", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test/";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards verified search and pagination parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([recallFixture]), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Total-Count": "27",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getRecalls({
      search: "  Salmonella  ",
      status: "Ongoing",
      sort: "newest",
      source: "fda",
      recordType: "recall",
      limit: 5,
      offset: 10,
    });

    expect(result).toEqual([recallFixture]);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("source=fda");
    expect(url).toContain("record_type=recall");
    expect(url).toContain("search=Salmonella");
    expect(url).toContain("status=Ongoing");
    expect(url).toContain("sort=newest");
    expect(url).toContain("limit=5");
    expect(url).toContain("offset=10");
  });

  it("returns truthful pagination metadata from response headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([recallFixture]), {
          status: 200,
          headers: { "X-Total-Count": "25" },
        }),
      ),
    );

    await expect(getRecallPage({ limit: 12, offset: 24 })).resolves.toEqual({
      recalls: [recallFixture],
      totalCount: 25,
    });
  });

  it("loads a simple recall list without requiring pagination headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([recallFixture]), { status: 200 }),
      ),
    );

    await expect(getRecalls({ limit: 4 })).resolves.toEqual([recallFixture]);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).not.toContain("source=");
  });

  it("rejects missing or malformed pagination metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([recallFixture]), { status: 200 }),
      ),
    );

    await expect(getRecallPage()).rejects.toThrow(
      "The recall service did not provide valid pagination metadata.",
    );
  });

  it("rejects malformed API data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ id: "incomplete" }]), { status: 200 }),
      ),
    );

    await expect(getRecalls()).rejects.toThrow(
      "The recall service returned invalid recall data.",
    );
  });

  it("accepts legacy records without optional FDA code information", () => {
    const legacyRecall = { ...recallFixture };
    delete legacyRecall.product_code_info;
    delete legacyRecall.recalling_firm;

    expect(isRecall(legacyRecall)).toBe(true);
    expect(isRecall({ ...recallFixture, product_code_info: [] })).toBe(false);
  });

  it("surfaces API failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("failure", { status: 503 })),
    );

    await expect(getRecalls()).rejects.toMatchObject({
      name: "RecallApiError",
      status: 503,
    });
  });

  it("preserves a missing recall response for the detail route's 404 state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("missing", { status: 404 })),
    );

    await expect(getRecall("missing-recall")).rejects.toMatchObject({
      name: "RecallApiError",
      status: 404,
    });
  });
});
