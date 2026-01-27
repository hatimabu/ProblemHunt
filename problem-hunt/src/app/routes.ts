import { createBrowserRouter } from "react-router";
import { LandingPage } from "./components/landing-page.tsx";
import { BrowseProblems } from "./components/browse-problems.tsx";
import { ProblemDetail } from "./components/problem-detail.tsx";
import { BuilderDashboard } from "./components/builder-dashboard.tsx";
import { PostProblem } from "./components/post-problem.tsx";
import { AuthPage } from "./components/auth-page.tsx";

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
    Component: BuilderDashboard,
  },
  {
    path: "/auth",
    Component: AuthPage,
  },
]);
