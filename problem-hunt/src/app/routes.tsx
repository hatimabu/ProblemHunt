import { createBrowserRouter, Navigate } from "react-router";
import { LandingPage } from "./components/landing-page.tsx";
import { BrowseProblems } from "./components/browse-problems.tsx";
import { ProblemDetail } from "./components/problem-detail.tsx";
import { BuilderDashboard } from "./components/builder-dashboard.tsx";
import { PostProblem } from "./components/post-problem.tsx";
import { AuthPage } from "./components/auth-page.tsx";
import { Leaderboard } from "./components/leaderboard.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/browse",
    Component: BrowseProblems,
  },
  {
    path: "/problem/:id",
    Component: ProblemDetail,
  },
  {
    path: "/post",
    element: (
      <ProtectedRoute>
        <PostProblem />
      </ProtectedRoute>
    ),
  },
  {
    path: "/builder-dashboard",
    element: (
      <ProtectedRoute>
        <BuilderDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dashboard",
    element: <Navigate to="/builder-dashboard" replace />,
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <BuilderDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/leaderboard",
    Component: Leaderboard,
  },
  {
    path: "/auth",
    Component: AuthPage,
  },
]);
