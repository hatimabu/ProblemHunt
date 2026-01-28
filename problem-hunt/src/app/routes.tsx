import { createBrowserRouter } from "react-router";
import { LandingPage } from "./components/landing-page.tsx";
import { BrowseProblems } from "./components/browse-problems.tsx";
import { ProblemDetail } from "./components/problem-detail.tsx";
import { BuilderDashboard } from "./components/builder-dashboard.tsx";
import { PostProblem } from "./components/post-problem.tsx";
import { AuthPage } from "./components/auth-page.tsx";
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
    Component: PostProblem,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute requireBuilder={true}>
        <BuilderDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/auth",
    Component: AuthPage,
  },
]);
