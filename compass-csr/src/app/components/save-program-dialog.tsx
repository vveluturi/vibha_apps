import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface SaveProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedName: string;
  onSave: (name: string) => void;
}

export function SaveProgramDialog({
  open,
  onOpenChange,
  suggestedName,
  onSave,
}: SaveProgramDialogProps) {
  const [name, setName] = useState(suggestedName);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setName(suggestedName);
    }
    onOpenChange(nextOpen);
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Program</DialogTitle>
          <DialogDescription>
            Give your program a name before saving it to My Programs.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="program-name">Program name</Label>
          <Input
            id="program-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter program name"
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSave();
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Save className="h-4 w-4" /> Save Program
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
