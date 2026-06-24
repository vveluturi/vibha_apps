import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Sparkles, TrendingUp, Heart, Users, FileText, Pin, PlusCircle } from "lucide-react";
import { usePrograms } from "../context/programs-context";
import { useWizard } from "../context/wizard-context";
import { useNavigate } from "react-router";
import { PROGRAM_STATUS_STYLES } from "../types/program";
import { formatProgramDate } from "../lib/blueprint-data";

export function Dashboard() {
  const { programs } = usePrograms();
  const { resetWizard } = useWizard();
  const navigate = useNavigate();

  const activePrograms = programs.filter((p) => p.status !== "Archived");
  const pinnedPrograms = activePrograms.filter((p) => p.pinned);
  const recentPrograms = activePrograms.filter((p) => !p.pinned).slice(0, 3);
  const displayPrograms = [...pinnedPrograms, ...recentPrograms].slice(0, 3);

  function handleNewProgram() {
    resetWizard();
    navigate("/new-program");
  }

  const stats = [
    {
      label: "Active Programs",
      value: String(activePrograms.length),
      icon: TrendingUp,
      description: "CSR programs running",
    },
    {
      label: "Nonprofit Partners",
      value: "0",
      icon: Heart,
      description: "Organizations connected",
    },
    {
      label: "Team Members Engaged",
      value: "0",
      icon: Users,
      description: "Employees participating",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">

      {/* Welcome Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-accent/30 to-card">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">Welcome back, Acme Corporation</CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Your CSR program is taking shape. Let's make an impact together.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-3xl font-semibold text-foreground">{stat.value}</div>
                  <p className="text-sm text-muted-foreground">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CTA Section */}
      <Card>
        <CardHeader>
          <CardTitle>Get Started</CardTitle>
          <CardDescription>
            Design and launch your first CSR program with AI-powered guidance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={handleNewProgram}>
            <Sparkles className="h-5 w-5 mr-2" />
            Start a New Program
          </Button>
        </CardContent>
      </Card>

      {/* ── My Programs Section ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1">My Programs</h2>
            <p className="text-sm text-muted-foreground">
              Your most recent CSR programs
            </p>
          </div>
          {activePrograms.length > 0 && (
            <div className="flex items-center gap-3">
              <Link
                to="/my-programs"
                className="text-sm text-primary hover:underline font-medium"
              >
                View all →
              </Link>
              <Button size="sm" variant="outline" onClick={handleNewProgram} className="gap-1.5">
                <PlusCircle className="h-4 w-4" /> New Program
              </Button>
            </div>
          )}
        </div>

        {/* Empty state */}
        {activePrograms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-muted rounded-full mb-4">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No programs yet
              </h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                You haven't created any CSR programs yet. Start by launching your
                first program to make a positive impact.
              </p>
              <Button variant="outline" onClick={handleNewProgram}>
                Create Your First Program
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Program cards grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayPrograms.map((program) => (
              <Card
                key={program.id}
                className={`border-border shadow-sm hover:shadow-md transition-shadow ${
                  program.pinned ? "ring-2 ring-primary/30" : ""
                }`}
              >
                <CardContent className="p-5">
                  {/* Pin indicator */}
                  {program.pinned && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Pin className="h-3 w-3 text-primary fill-primary" />
                      <span className="text-xs font-medium text-primary uppercase tracking-wide">
                        Pinned
                      </span>
                    </div>
                  )}

                  {/* Name + status */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-base font-semibold text-foreground leading-snug">
                      {program.name}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium flex-shrink-0 ${
                        PROGRAM_STATUS_STYLES[
                          program.status as keyof typeof PROGRAM_STATUS_STYLES
                        ] ?? "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {program.status}
                    </span>
                  </div>

                  {/* Date */}
                  <p className="text-sm text-muted-foreground mb-4">
                    Created {formatProgramDate(program.createdAt)}
                  </p>

                  {/* Action */}
                  <Button asChild size="sm" variant="outline" className="gap-1.5 w-full">
                    <Link to={`/programs/${program.id}/blueprint`}>
                      <FileText className="h-4 w-4" /> View Blueprint
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}

            {/* "View all" card if there are more than 3 */}
            {activePrograms.length > 3 && (
              <Card className="border-dashed border-border shadow-none hover:border-primary/40 transition-colors">
                <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-[160px] text-center">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    +{activePrograms.length - 3} more program{activePrograms.length - 3 !== 1 ? "s" : ""}
                  </p>
                  <Link
                    to="/my-programs"
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    View all in My Programs →
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}