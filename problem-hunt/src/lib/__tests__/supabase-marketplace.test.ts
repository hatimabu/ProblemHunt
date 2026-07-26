import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("../../../lib/supabaseClient", () => ({ supabase: supabaseMock }));

import { getDashboardSnapshot } from "../supabase-marketplace";

describe("getDashboardSnapshot", () => {
  beforeEach(() => {
    supabaseMock.from.mockReset();
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { username: "Ada" }, error: null }) })) })) };
      }
      if (table === "wallets") return { select: vi.fn().mockResolvedValue({ count: 1, error: null }) };
      if (table === "notifications") return { select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })) };
      if (table === "problems" || table === "proposals") return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })) })) };
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it("only requests the signed-in user's profile, posted briefs, and proposals", async () => {
    await getDashboardSnapshot("user-123");

    const profileQuery = supabaseMock.from.mock.results[0].value.select.mock.results[0].value;
    const postQuery = supabaseMock.from.mock.results[3].value.select.mock.results[0].value;
    const proposalQuery = supabaseMock.from.mock.results[4].value.select.mock.results[0].value;

    expect(profileQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(postQuery.eq).toHaveBeenCalledWith("author_id", "user-123");
    expect(proposalQuery.eq).toHaveBeenCalledWith("builder_id", "user-123");
  });
});
