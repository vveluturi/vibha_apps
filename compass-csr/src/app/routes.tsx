import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout";
import { ProtectedRoute } from "./components/protected-route";
import { WizardRouteLayout } from "./components/wizard-route-layout";
import { SignIn } from "./pages/auth/signin";
import { SignUp } from "./pages/auth/signup";
import { ResetPassword } from "./pages/auth/reset-password";
import { Dashboard } from "./pages/dashboard";
import { NewProgram } from "./pages/new-program";
import { NewProgramStep2 } from "./pages/new-program-step2";
import { NewProgramStep3 } from "./pages/new-program-step3";
import { NewProgramStep4 } from "./pages/new-program-step4";
import { ProgramBlueprint } from "./pages/program-blueprint";
import { ProgramDashboard } from "./pages/program-dashboard";
import { MyPrograms } from "./pages/my-programs";
import { MyTasks } from "./pages/my-tasks";
import { NonprofitPartners } from "./pages/nonprofit-partners";
import { PartnershipDetail } from "./pages/partnership-detail";
import { ImpactReport } from "./pages/impact-report";
import { WeeklyDigest } from "./pages/weekly-digest";
import { Team } from "./pages/team";
import { Settings } from "./pages/settings";

// Gates the entire app shell behind auth in one place, rather than wrapping
// every child route individually.
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  { path: "/signin", Component: SignIn },
  { path: "/signup", Component: SignUp },
  { path: "/reset-password", Component: ResetPassword },
  {
    path: "/",
    Component: ProtectedLayout,
    children: [
      { index: true, Component: Dashboard },
      {
        path: "new-program",
        Component: WizardRouteLayout,
        children: [
          { index: true, Component: NewProgram },
          { path: "step-2", Component: NewProgramStep2 },
          { path: "step-3", Component: NewProgramStep3 },
          { path: "step-4", Component: NewProgramStep4 },
        ],
      },
      { path: "programs/:id", Component: ProgramDashboard },
      { path: "programs/:id/blueprint", Component: ProgramBlueprint },
      { path: "my-programs", Component: MyPrograms },
      { path: "my-tasks", Component: MyTasks },
      { path: "nonprofit-partners", Component: NonprofitPartners },
      { path: "partnerships/:nonprofitName", Component: PartnershipDetail },
      { path: "impact-report", Component: ImpactReport },
      { path: "weekly-digest", Component: WeeklyDigest },
      { path: "team", Component: Team },
      { path: "settings", Component: Settings },
    ],
  },
]);
