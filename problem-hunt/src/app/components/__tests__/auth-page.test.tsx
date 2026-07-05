import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPage } from "../auth-page";

const navigateMock = vi.fn();
const loginMock = vi.fn();
const signupMock = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    login: loginMock,
    signup: signupMock,
    logout: vi.fn(),
  }),
}));

function renderAuthPage() {
  render(
    <MemoryRouter initialEntries={["/auth"]}>
      <AuthPage />
    </MemoryRouter>
  );
}

describe("AuthPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    loginMock.mockReset();
    signupMock.mockReset();
  });

  it("submits login credentials and navigates to the dashboard", async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue(undefined);
    renderAuthPage();

    await user.type(screen.getByLabelText(/email/i), "builder@example.com");
    await user.type(screen.getByLabelText(/password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    expect(loginMock).toHaveBeenCalledWith("builder@example.com", "correct-password");
    expect(navigateMock).toHaveBeenCalledWith("/dashboard");
  });

  it("submits signup data for a problem poster and routes to browse", async () => {
    const user = userEvent.setup();
    signupMock.mockResolvedValue(undefined);
    renderAuthPage();

    await user.click(screen.getByRole("tab", { name: /sign up/i }));
    await user.type(screen.getByLabelText(/username/i), "poster");
    await user.type(screen.getByLabelText(/full name/i), "Poster User");
    await user.type(screen.getByLabelText(/email/i), "poster@example.com");
    await user.type(screen.getByLabelText(/password/i), "strong-password");
    await user.click(screen.getByRole("button", { name: /post publish work/i }));
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(signupMock).toHaveBeenCalledWith(
      "poster",
      "Poster User",
      "poster@example.com",
      "strong-password",
      "problem_poster"
    );
    expect(navigateMock).toHaveBeenCalledWith("/browse");
  });
});
