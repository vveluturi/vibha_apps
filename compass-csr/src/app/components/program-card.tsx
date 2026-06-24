import { Link, useNavigate } from "react-router";
import {
  Archive,
  Copy,
  Eye,
  FileText,
  MoreVertical,
  Pencil,
  Pin,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useState } from "react";
import { usePrograms } from "../context/programs-context";
import { formatProgramDate } from "../lib/blueprint-data";
import type { SavedProgram } from "../types/program";
import { PROGRAM_STATUS_STYLES } from "../types/program";
 
interface ProgramCardProps {
  program: SavedProgram;
  onEdit: (program: SavedProgram) => void;
  pinned?: boolean;
}
 
export function ProgramCard({ program, onEdit, pinned = false }: ProgramCardProps) {
  const navigate = useNavigate();
  const { duplicateProgram, archiveProgram, deleteProgram, pinProgram } = usePrograms();
  const isArchived = program.status === "Archived";
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 
  function handleDuplicate() {
    const duplicate = duplicateProgram(program.id);
    if (duplicate) toast.success("Program duplicated");
  }
 
  function handleArchive() {
    archiveProgram(program.id);
    toast.success("Program archived");
  }
 
  function handleDelete() {
    deleteProgram(program.id);
    toast.success("Program deleted");
    setDeleteDialogOpen(false);
  }
 
  function handlePin() {
    pinProgram(program.id);
    toast.success(program.pinned ? "Program unpinned" : "Program pinned");
  }
 
  return (
    <>
      <Card
        className={`border-border shadow-sm transition-all duration-200 ${
          isArchived ? "opacity-70" : ""
        } ${pinned ? "ring-2 ring-primary/30 shadow-md" : ""}`}
      >
        <CardContent className={`${pinned ? "p-6" : "p-5"}`}>
          {/* Pin badge */}
          {pinned && (
            <div className="flex items-center gap-1.5 mb-3">
              <Pin className="h-3 w-3 text-primary fill-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">Pinned</span>
            </div>
          )}
 
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className={`font-semibold text-foreground truncate ${pinned ? "text-lg" : "text-base"}`}>
                  {program.name}
                </h3>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    isArchived
                      ? "bg-muted text-muted-foreground border-border"
                      : PROGRAM_STATUS_STYLES[program.status]
                  }`}
                >
                  {program.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Created {formatProgramDate(program.createdAt)}
              </p>
              {pinned && program.intake?.step1?.industry && (
                <p className="text-sm text-muted-foreground mt-1">
                  {program.intake.step1.industry} · {program.intake.step1.companySize} employees
                </p>
              )}
            </div>
 
            {/* Three-dot menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Program actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/programs/${program.id}/blueprint`)}>
                  <Eye className="h-4 w-4" /> View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(program)}>
                  <Pencil className="h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="h-4 w-4" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePin}>
                  <Pin className="h-4 w-4" />
                  {program.pinned ? "Unpin" : "Pin to top"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleArchive}
                  disabled={isArchived}
                  className="text-muted-foreground focus:text-foreground"
                >
                  <Archive className="h-4 w-4" /> Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
 
          <div className="mt-4">
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to={`/programs/${program.id}/blueprint`}>
                <FileText className="h-4 w-4" /> View Blueprint
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
 
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this program?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{program.name}</strong>? This action cannot be undone and all program data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
 