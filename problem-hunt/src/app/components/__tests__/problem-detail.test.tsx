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
    currentUser.id = "builder-1";
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

  it("warns the accepted builder to wait until funding is secured", async () => {
    marketplaceMocks.getProblem.mockResolvedValue({
      ...baseProblem,
      type: "job",
      jobStatus: "awaiting_funding",
      acceptedProposalId: "proposal-1",
      acceptedBuilderId: "builder-1",
      acceptedBuilderWalletAddress: "BuilderWallet111111111111111111111111111",
      budgetSol: 1,
    });
    marketplaceMocks.listProposals.mockResolvedValue([{
      id: "proposal-1",
      problemId: "problem-1",
      title: "I can help",
      description: "I will automate the deployment.",
      builderId: "builder-1",
      builderName: "Builder",
      status: "accepted",
      proposedPriceSol: 1,
      builderWalletAddress: "BuilderWallet111111111111111111111111111",
      createdAt: "2026-06-02T00:00:00Z",
    }]);

    renderProblemDetail();

    expect((await screen.findAllByText("Awaiting Funding")).length).toBeGreaterThan(0);
    expect(await screen.findByText(/do not begin work until the job is securely funded/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark complete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /phantom/i })).not.toBeInTheDocument();
  });

  it("shows the owner the accepted agreement and a disabled escrow action", async () => {
    currentUser.id = "owner-1";
    marketplaceMocks.getProblem.mockResolvedValue({
      ...baseProblem,
      type: "job",
      jobStatus: "awaiting_funding",
      acceptedProposalId: "proposal-1",
      acceptedBuilderId: "builder-1",
      acceptedBuilderWalletAddress: "BuilderWallet111111111111111111111111111",
      budgetSol: 1.5,
    });
    marketplaceMocks.listProposals.mockResolvedValue([{
      id: "proposal-1",
      problemId: "problem-1",
      title: "I can help",
      description: "I will automate the deployment.",
      builderId: "builder-1",
      builderName: "Builder",
      status: "accepted",
      proposedPriceSol: 1.25,
      builderWalletAddress: "BuilderWallet111111111111111111111111111",
      createdAt: "2026-06-02T00:00:00Z",
    }]);

    renderProblemDetail();

    expect(await screen.findByText("Accepted agreement")).toBeInTheDocument();
    expect(screen.getAllByText("1.25 SOL").length).toBeGreaterThan(0);
    expect(screen.getByText("Solana")).toBeInTheDocument();
    expect(screen.getByText("Waiting for secure funding")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fund escrow/i })).toBeDisabled();
    expect(screen.getByText(/do not send funds directly/i)).toBeInTheDocument();
  });

});
