import { createBrowserRouter } from "react-router";
import { LandingPage } from "@/app/components/landing-page";
import { BrowseProblems } from "@/app/components/browse-problems";
import { ProblemDetail } from "@/app/components/problem-detail";
import { BuilderDashboard } from "@/app/components/builder-dashboard";
import { PostProblem } from "@/app/components/post-problem";
import { AuthPage } from "@/app/components/auth-page";

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
