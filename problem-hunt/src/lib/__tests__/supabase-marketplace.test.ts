import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));

vi.mock("../../../lib/supabaseClient", () => ({ supabase: supabaseMock }));

import { approveJobDelivery, getDashboardSnapshot, openJobDispute, submitJobDelivery } from "../supabase-marketplace";

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
    expect(supabaseMock.from.mock.results[0].value.select).toHaveBeenCalledWith("username,full_name,bio,reputation_score,user_type,created_at,avatar_url");
  });
});

describe("job contract actions", () => {
  beforeEach(() => supabaseMock.rpc.mockReset());

  it("sends delivery through the protected database function", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { id: "c1", job_id: "j1", proposal_id: "p1", client_id: "u1", builder_id: "u2", agreed_amount_sol: 2, asset: "SOL", network: "solana", status: "submitted" }, error: null });
    await submitJobDelivery("j1", "https://example.com/delivery", "Ready for review");
    expect(supabaseMock.rpc).toHaveBeenCalledWith("submit_job_delivery", {
      p_job_id: "j1", p_delivery_url: "https://example.com/delivery", p_delivery_note: "Ready for review",
    });
  });

  it("uses separate protected actions for approval and disputes", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { id: "c1", job_id: "j1", proposal_id: "p1", client_id: "u1", builder_id: "u2", agreed_amount_sol: 2, asset: "SOL", network: "solana", status: "release_pending" }, error: null });
    await approveJobDelivery("j1");
    await openJobDispute("j1", "The delivered result does not match the agreed scope.");
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(1, "approve_job_delivery", { p_job_id: "j1" });
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(2, "open_job_dispute", { p_job_id: "j1", p_reason: "The delivered result does not match the agreed scope." });
  });
});
