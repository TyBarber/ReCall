import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getRecalls } from "@/lib/api/recalls";
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
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getRecalls({
      search: "  Salmonella  ",
      status: "Ongoing",
      limit: 5,
      offset: 10,
    });

    expect(result).toEqual([recallFixture]);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("source=fda");
    expect(url).toContain("search=Salmonella");
    expect(url).toContain("status=Ongoing");
    expect(url).toContain("limit=5");
    expect(url).toContain("offset=10");
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
});
