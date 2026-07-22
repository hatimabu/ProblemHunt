import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProblemDetail } from "../problem-detail";

const marketplaceMocks = vi.hoisted(() => ({
  acceptProposal: vi.fn(),
  createProposal: vi.fn(),
  deleteProblem: vi.fn(),
  getProblem: vi.fn(),
  listProposals: vi.fn(),
  markJobComplete: vi.fn(),
  recordJobPayment: vi.fn(),
  recordTip: vi.fn(),
  toggleProblemUpvote: vi.fn(),
}));

const currentUser = {
  id: "builder-1",
  email: "builder@example.com",
  username: "Builder",
  role: "builder",
};

const baseProblem = {
  id: "problem-1",
  type: "problem",
  title: "Need a better deployment workflow",
  description: "Current deployment is too manual.",
  category: "DevOps",
  budget: "$500",
  author: "Owner",
  authorId: "owner-1",
  upvotes: 2,
  proposals: 0,
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
};

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: currentUser,
    isLoading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("../../../lib/supabase-marketplace", () => marketplaceMocks);

vi.mock("../../../lib/wallets", () => ({
  getUserSolanaWallet: vi.fn().mockResolvedValue(null),
  syncUserSolanaWallet: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../lib/solana-payments", () => ({
  connectSolanaWallet: vi.fn(),
  sendSolTransfer: vi.fn(),
}));

function renderProblemDetail() {
  render(
    <MemoryRouter initialEntries={["/problem/problem-1"]}>
      <Routes>
        <Route path="/problem/:id" element={<ProblemDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProblemDetail", () => {
  beforeEach(() => {
    Object.values(marketplaceMocks).forEach((mock) => mock.mockReset());
  });

  it("submits a proposal and refreshes the proposal list", async () => {
    const user = userEvent.setup();
    marketplaceMocks.getProblem
      .mockResolvedValueOnce(baseProblem)
      .mockResolvedValueOnce({ ...baseProblem, proposals: 1 });
    marketplaceMocks.listProposals
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: "proposal-1",
        problemId: "problem-1",
        title: "I can help",
        description: "I will automate the deployment.",
        builderId: "builder-1",
        builderName: "Builder",
        status: "pending",
        createdAt: "2026-06-02T00:00:00Z",
      }]);
    marketplaceMocks.createProposal.mockResolvedValue({ id: "proposal-1" });

    renderProblemDetail();

    await screen.findByText("Need a better deployment workflow");
    await user.click(screen.getByRole("button", { name: /submit proposal/i }));
    const proposalFields = screen.getAllByRole("textbox");
    await user.type(proposalFields[0], "I can help");
    await user.type(proposalFields[1], "I will automate the deployment.");
    await user.click(screen.getAllByRole("button", { name: /^submit proposal$/i }).at(-1)!);

    await waitFor(() => {
      expect(marketplaceMocks.createProposal).toHaveBeenCalledWith("problem-1", {
        title: "I can help",
        description: "I will automate the deployment.",
        briefSolution: "",
        timeline: "",
        estimatedDelivery: "",
        cost: "",
        proposedPriceSol: undefined,
        projectUrl: undefined,
        expertise: [],
      });
    });
    expect(await screen.findByText("Proposal submitted successfully.")).toBeInTheDocument();
    expect(await screen.findByText("I will automate the deployment.")).toBeInTheDocument();
  });

  it("toggles an existing upvote through the Supabase workflow", async () => {
    const user = userEvent.setup();
    marketplaceMocks.getProblem
      .mockResolvedValueOnce(baseProblem)
      .mockResolvedValueOnce({ ...baseProblem, upvotes: 1 });
    marketplaceMocks.listProposals.mockResolvedValue([]);
    marketplaceMocks.toggleProblemUpvote.mockResolvedValue({ ...baseProblem, upvotes: 1 });

    renderProblemDetail();

    await screen.findByText("Need a better deployment workflow");
    await user.click(screen.getByRole("button", { name: /upvote/i }));

    await waitFor(() => {
      expect(marketplaceMocks.toggleProblemUpvote).toHaveBeenCalledWith("problem-1");
    });
    expect(await screen.findByText(/1 upvotes/i)).toBeInTheDocument();
  });
});
