import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    updateUser: vi.fn(),
  },
}));

const navigateMock = vi.fn();

vi.mock("../../../../lib/supabaseClient", () => ({ supabase: supabaseMock }));
vi.mock("../navbar", () => ({ Navbar: () => <nav>Navbar</nav> }));
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => navigateMock };
});

import { ResetPasswordPage } from "../reset-password-page";

const session = { access_token: "access-token", refresh_token: "refresh-token" };

function renderPage(url = "/reset-password") {
  window.history.pushState({}, "", url);
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ResetPasswordPage />
    </MemoryRouter>
  );
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/reset-password");
  });

  it("exchanges a PKCE recovery code and removes the callback payload after verification", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    supabaseMock.auth.exchangeCodeForSession.mockResolvedValue({ data: { session }, error: null });

    renderPage("/reset-password?code=pkce-code&type=recovery&sb_flow_id=flow-1");

    expect(await screen.findByLabelText("New password")).toBeInTheDocument();
    expect(supabaseMock.auth.exchangeCodeForSession).toHaveBeenCalledWith("pkce-code", { flowId: "flow-1" });
    expect(window.location.search).toBe("");
  });

  it("accepts an implicit-flow recovery callback when Supabase has established its session", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null });

    renderPage("/reset-password#access_token=access-token&refresh_token=refresh-token&type=recovery");

    expect(await screen.findByLabelText("New password")).toBeInTheDocument();
    expect(supabaseMock.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
  });

  it("shows the same invalid-link error for expired or invalid callbacks", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    renderPage("/reset-password?error_code=otp_expired&type=recovery");

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid or has expired/i);
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });

  it("validates password length and confirmation before updating", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText("New password");

    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "different");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 6 characters/i);
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });

  it("updates the password and shows the success state", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    supabaseMock.auth.updateUser.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText("New password");

    await user.type(screen.getByLabelText("New password"), "new-password");
    await user.type(screen.getByLabelText("Confirm password"), "new-password");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: "new-password" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/password has been updated/i);
  });
});
