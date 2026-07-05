import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProblemDetail } from "../problem-detail";

const { sessionToken } = vi.hoisted(() => ({ sessionToken: "test-token" }));
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

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: currentUser,
    isLoading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("../../../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: sessionToken } },
        error: null,
      }),
    },
  },
}));

vi.mock("../../../lib/wallets", () => ({
  getUserSolanaWallet: vi.fn().mockResolvedValue(null),
  syncUserSolanaWallet: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../lib/solana-payments", () => ({
  connectSolanaWallet: vi.fn(),
  sendSolTransfer: vi.fn(),
}));

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

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
    fetchMock.mockReset();
  });

  it("submits a proposal and refreshes the proposal list", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(baseProblem))
      .mockResolvedValueOnce(jsonResponse({ proposals: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: "proposal-1" }, { status: 201 }))
      .mockResolvedValueOnce(jsonResponse({ ...baseProblem, proposals: 1 }))
      .mockResolvedValueOnce(jsonResponse({
        proposals: [
          {
            id: "proposal-1",
            problemId: "problem-1",
            title: "I can help",
            description: "I will automate the deployment.",
            builderId: "builder-1",
            builderName: "Builder",
            status: "pending",
            createdAt: "2026-06-02T00:00:00Z",
          },
        ],
      }));

    renderProblemDetail();

    await screen.findByText("Need a better deployment workflow");
    await user.click(screen.getByRole("button", { name: /submit proposal/i }));
    const proposalFields = screen.getAllByRole("textbox");
    await user.type(proposalFields[0], "I can help");
    await user.type(proposalFields[1], "I will automate the deployment.");
    await user.click(screen.getAllByRole("button", { name: /^submit proposal$/i }).at(-1)!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:7071/api/problems/problem-1/proposals",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          }),
          body: JSON.stringify({
            title: "I can help",
            description: "I will automate the deployment.",
            briefSolution: "",
            timeline: "",
            estimatedDelivery: "",
            cost: "",
            proposedPriceSol: undefined,
            projectUrl: undefined,
            expertise: [],
          }),
        })
      );
    });
    expect(await screen.findByText("Proposal submitted successfully.")).toBeInTheDocument();
    expect(await screen.findByText("I will automate the deployment.")).toBeInTheDocument();
  });

  it("toggles an existing upvote by deleting after a duplicate response", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(baseProblem))
      .mockResolvedValueOnce(jsonResponse({ proposals: [] }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "duplicate" }), { status: 409 }))
      .mockResolvedValueOnce(jsonResponse({ problem: { ...baseProblem, upvotes: 1 } }))
      .mockResolvedValueOnce(jsonResponse({ ...baseProblem, upvotes: 1 }))
      .mockResolvedValueOnce(jsonResponse({ proposals: [] }));

    renderProblemDetail();

    await screen.findByText("Need a better deployment workflow");
    await user.click(screen.getByRole("button", { name: /upvote/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:7071/api/problems/problem-1/upvote",
        expect.objectContaining({
          method: "POST",
          headers: { Authorization: `Bearer ${sessionToken}` },
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:7071/api/problems/problem-1/upvote",
        expect.objectContaining({
          method: "DELETE",
          headers: { Authorization: `Bearer ${sessionToken}` },
        })
      );
    });
    expect(await screen.findByText(/1 upvotes/i)).toBeInTheDocument();
  });
});
