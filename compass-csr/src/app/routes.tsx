import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout";
import { WizardRouteLayout } from "./components/wizard-route-layout";
import { Dashboard } from "./pages/dashboard";
import { NewProgram } from "./pages/new-program";
import { NewProgramStep2 } from "./pages/new-program-step2";
import { NewProgramStep3 } from "./pages/new-program-step3";
import { NewProgramStep4 } from "./pages/new-program-step4";
import { ProgramBlueprint } from "./pages/program-blueprint";
import { ProgramDashboard } from "./pages/program-dashboard";
import { MyPrograms } from "./pages/my-programs";
import { NonprofitPartners } from "./pages/nonprofit-partners";
import { Team } from "./pages/team";
import { Settings } from "./pages/settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
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
      { path: "nonprofit-partners", Component: NonprofitPartners },
      { path: "team", Component: Team },
      { path: "settings", Component: Settings },
    ],
  },
]);
