import { ModeratorPage } from './components/community/moderation';
import { ReputationPage } from './components/community/reputation';
import { createBrowserRouter, Navigate } from "react-router";
import { CommunityHome, CommunityLibrary, CommunityDashboard } from "./components/community/library";
import { CommunityDiscussion } from "./components/community/problem-discussion";
import { CommunityEditor } from "./components/community/problem-editor";
import { CommunityDiscovery } from "./components/community/discovery";
import { AuthPage } from "./components/auth-page.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { ResetPasswordPage } from "./components/reset-password-page.tsx";

export const router = createBrowserRouter([{ path: "/moderation", element: <ProtectedRoute><ModeratorPage /></ProtectedRoute> },
  {
    path: "/",
    Component: CommunityHome,
  },
  {
    path: "/browse",
    Component: CommunityDiscovery,
  },
  { path: "/domains/:domain", Component: CommunityDiscovery },
  {
    path: "/problem/:id",
    Component: CommunityDiscussion,
  },
  { path: "/problem/:id/edit", element: <ProtectedRoute><CommunityEditor /></ProtectedRoute> },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <CommunityDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/post-problem",
    element: (
      <ProtectedRoute>
        <CommunityEditor />
      </ProtectedRoute>
    ),
  },
  {
    path: "/builder-dashboard",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/profile",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/leaderboard",
    Component: ReputationPage,
  },
  {
    path: "/auth",
    Component: AuthPage,
  },
  {
    path: "/reset-password",
    Component: ResetPasswordPage,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
