import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPage } from "../auth-page";

const navigateMock = vi.fn();
const loginMock = vi.fn();
const signupMock = vi.fn();
const authState = vi.hoisted(() => ({ user: null as null | {id:string}, isLoading: false }));
const sessionMock = vi.hoisted(() => vi.fn());
vi.mock('../../../../lib/supabaseClient', () => ({ supabase: { auth: { getSession: sessionMock } } }));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    ...authState,
    login: loginMock,
    signup: signupMock,
    logout: vi.fn(),
  }),
}));

function renderAuthPage(path = '/auth') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthPage />
    </MemoryRouter>
  );
}

describe("AuthPage", () => {
  beforeEach(() => {
    navigateMock.mockReset(); authState.user = null; authState.isLoading = false;
    loginMock.mockReset();
    signupMock.mockReset();
    sessionMock.mockResolvedValue({ data: { session: null } });
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

  it("submits signup data and explains email confirmation when no session exists", async () => {
    const user = userEvent.setup();
    signupMock.mockResolvedValue(undefined);
    renderAuthPage();

    await user.click(screen.getByRole("tab", { name: /sign up/i }));
    await user.type(screen.getByLabelText(/username/i), "poster");
    await user.type(screen.getByLabelText(/full name/i), "Poster User");
    await user.type(screen.getByLabelText(/email/i), "poster@example.com");
    await user.type(screen.getByLabelText(/password/i), "strong-password");
    await user.click(screen.getByRole("button", { name: /ask describe a problem/i }));
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(signupMock).toHaveBeenCalledWith(
      "poster",
      "Poster User",
      "poster@example.com",
      "strong-password",
      "problem_poster"
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Check your email');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it.each([
    ['/auth?returnTo=%2Fproblem%2Fcase-1', '/problem/case-1'],
    ['/auth?returnTo=https%3A%2F%2Fevil.example', '/dashboard'],
  ])('honors safe return links only: %s', async (path, expected) => {
    loginMock.mockResolvedValue(undefined);
    renderAuthPage(path);
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password');
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
    expect(navigateMock).toHaveBeenCalledWith(expected);
  });
});

it('resumes a protected route when the signed-in profile arrives after login navigation',()=>{
 authState.user=null;authState.isLoading=false;
 const view=render(<MemoryRouter initialEntries={['/auth?returnTo=%2Fpost-problem']}><AuthPage/></MemoryRouter>);
 navigateMock.mockClear();authState.user={id:'signed-in'};
 view.rerender(<MemoryRouter initialEntries={['/auth?returnTo=%2Fpost-problem']}><AuthPage/></MemoryRouter>);
 expect(navigateMock).toHaveBeenCalledWith('/post-problem',{replace:true});authState.user=null;
});