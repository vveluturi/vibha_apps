import { RouterProvider } from "react-router";
import { AuthProvider } from "./context/auth-context";
import { ProgramsProvider } from "./context/programs-context";
import { WizardProvider } from "./context/wizard-context";
import { Toaster } from "./components/ui/sonner";
import { router } from "./routes";

export default function App() {
  return (
    <AuthProvider>
      <ProgramsProvider>
        <WizardProvider>
          <RouterProvider router={router} />
          <Toaster />
        </WizardProvider>
      </ProgramsProvider>
    </AuthProvider>
  );
}
