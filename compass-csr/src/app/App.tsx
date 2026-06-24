import { RouterProvider } from "react-router";
import { ProgramsProvider } from "./context/programs-context";
import { WizardProvider } from "./context/wizard-context";
import { Toaster } from "./components/ui/sonner";
import { router } from "./routes";

export default function App() {
  return (
    <ProgramsProvider>
      <WizardProvider>
        <RouterProvider router={router} />
        <Toaster />
      </WizardProvider>
    </ProgramsProvider>
  );
}
