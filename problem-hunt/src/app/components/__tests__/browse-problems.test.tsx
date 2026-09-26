import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowseProblems } from "../browse-problems";

const mocks = vi.hoisted(() => ({ listProblems: vi.fn() }));
vi.mock("../../../lib/supabase-marketplace", () => mocks);
vi.mock("../navbar", () => ({ Navbar: () => null }));

const problem = (id: string, title: string) => ({
  id, title, description: "Deployment symptoms", category: "DevOps",
  authorId: "author", upvotes: 0, proposals: 0,
  createdAt: "2026-09-25T12:00:00Z", updatedAt: "2026-09-25T12:00:00Z",
});

function renderBrowse() {
  render(<MemoryRouter><BrowseProblems /></MemoryRouter>);
}

describe("problem discovery reliability", () => {
  beforeEach(() => mocks.listProblems.mockReset());

  it("shows a recoverable failure rather than an empty library and retries", async () => {
    mocks.listProblems.mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce([problem("fix", "A recovered result")]);
    renderBrowse();
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "A recovered result" })).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.listProblems).toHaveBeenCalledTimes(2);
  });

  it.each(["success", "failure"])("ignores a stale %s after a filter change", async (outcome) => {
    let resolveOld!: (rows: ReturnType<typeof problem>[]) => void;
    let rejectOld!: (error: Error) => void;
    mocks.listProblems.mockImplementationOnce(() => new Promise((resolve, reject) => {
      resolveOld = resolve; rejectOld = reject;
    })).mockResolvedValueOnce([problem("new", "Current filter result")]);
    renderBrowse();
    await userEvent.click(screen.getByRole("button", { name: "Problems" }));
    expect(await screen.findByRole("heading", { name: "Current filter result" })).toBeVisible();
    await act(async () => {
      if (outcome === "success") resolveOld([problem("old", "Stale result")]);
      else rejectOld(new Error("Late failure"));
    });
    expect(screen.getByRole("heading", { name: "Current filter result" })).toBeVisible();
    expect(screen.queryByText("Stale result")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
