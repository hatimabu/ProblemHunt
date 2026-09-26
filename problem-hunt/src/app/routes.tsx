import { PrivacyPage } from './components/community/privacy';
import { ModeratorPage } from './components/community/moderation';
import { ReputationPage } from './components/community/reputation';
import { createBrowserRouter, Navigate } from "react-router";
import { CommunityLanding } from './components/community/home';
import { DashboardShell } from './components/community/workspace';
import { CommunityAccountDashboard, CommunityProfilePage, MyContributions } from './components/community/account';
import { CommunityDiscussion } from "./components/community/problem-discussion";
import { CommunityEditor } from "./components/community/problem-editor";
import { CommunityDiscovery } from "./components/community/discovery";
import { AuthPage } from "./components/auth-page.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { ResetPasswordPage } from "./components/reset-password-page.tsx";

export const router = createBrowserRouter([{path:"/privacy",Component:PrivacyPage},{ path: "/moderation", element: <ProtectedRoute><ModeratorPage /></ProtectedRoute> },
  {
    path: "/",
    Component: CommunityLanding,
  },
  {element:<CommunityDiscovery/>,children:[{path:'/browse',element:null},{path:'/domains/:domain',element:null}]},
  {
    path: "/problem/:id",
    Component: CommunityDiscussion,
  },
  { path: "/problem/:id/edit", element: <ProtectedRoute><CommunityEditor /></ProtectedRoute> },
  {element:<ProtectedRoute><DashboardShell/></ProtectedRoute>,children:[
    {path:'/dashboard',Component:CommunityAccountDashboard},
    {path:'/my-problems',element:<MyContributions kind="problems"/>},
    {path:'/my-solutions',element:<MyContributions kind="solutions"/>},
    {path:'/profile',Component:CommunityProfilePage},
    {path:'/dashboard/reputation',element:<ReputationPage embedded/>},
  ]},
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
  {path:'/people/:id',Component:CommunityProfilePage},
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
