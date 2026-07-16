import { useRef } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Download, Info, Share2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { BlueprintView, type BlueprintViewHandle } from "../components/blueprint-view";
import { usePrograms } from "../context/programs-context";
import { buildPdfFilename } from "../lib/pdf-export";

export function ProgramBlueprint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProgram } = usePrograms();
  const program = id ? getProgram(id) : undefined;
  const blueprintRef = useRef<BlueprintViewHandle>(null);

  function handleDownloadPdf() {
    void blueprintRef.current?.downloadPdf(
      buildPdfFilename("Compass-Blueprint", program?.name ?? "Program"),
    );
  }

  if (!program) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Program not found</h1>
        <p className="text-muted-foreground mb-6">
          This program may have been removed or the link is invalid.
        </p>
        <Button asChild variant="outline">
          <Link to="/my-programs">Back to My Programs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button
        type="button"
        onClick={() => navigate("/my-programs")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to My Programs
      </button>

      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-900">
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <span>
          This is your original AI-generated blueprint. Your live program with updated tasks,
          assignments, and notes is in the Program Dashboard.{" "}
          <Link to={`/programs/${id}`} className="text-primary hover:underline">
            Go to Program Dashboard →
          </Link>
        </span>
      </div>

      <BlueprintView
        ref={blueprintRef}
        storageKey={program.id}
        programName={program.name}
        companyName={program.intake.step1.companyName}
        blueprint={program.blueprint}
        showFooterActions={false}
        headerActions={
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5 text-sm" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-sm">
              <Share2 className="h-4 w-4" /> Share with Team
            </Button>
          </div>
        }
      />
    </div>
  );
}
