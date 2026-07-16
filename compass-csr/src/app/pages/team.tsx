
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Users, Plus, X, Camera, Pencil, Trash2, Mail, Check } from "lucide-react";
import {
  type TeamMember,
  loadTeamMembers as loadMembers,
  saveTeamMembers as saveMembers,
  createTeamMemberId as createId,
  colorForName,
  initials,
} from "../lib/team";
import { MemberAvatar as Avatar } from "../components/member-avatar";
import { useAuth } from "../context/auth-context";
import supabase from "../../lib/supabase";

// ─── Empty state ──────────────────────────────────────────────────────────────
 
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Users className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No team members yet</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-xs">
        Add the people who will help design and run your CSR programs.
      </p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        Add First Team Member
      </Button>
    </div>
  );
}
 
// ─── Member card ──────────────────────────────────────────────────────────────
 
function MemberCard({
  member,
  onEdit,
  onDelete,
}: {
  member: TeamMember;
  onEdit: (m: TeamMember) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="group relative hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(member)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Edit member"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(member.id)}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Remove member"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
 
        {/* Avatar + name */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar member={member} size="md" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{member.name}</p>
            <p className="text-sm text-muted-foreground truncate">{member.role}</p>
          </div>
        </div>
 
        {/* Email */}
        {member.email && (
          <p className="text-xs text-muted-foreground mb-3 truncate">{member.email}</p>
        )}
 
        {/* Skills */}
        {member.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {member.skills.slice(0, 5).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {member.skills.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{member.skills.length - 5}
              </Badge>
            )}
          </div>
        )}
 
        {/* Note */}
        {member.note && (
          <p className="text-xs text-muted-foreground line-clamp-2 border-t pt-2 mt-2">
            {member.note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
 
// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
 
const EMPTY_FORM = {
  name: "",
  role: "",
  email: "",
  note: "",
  skills: [] as string[],
  avatarUrl: null as string | null,
};
 
function MemberModal({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: TeamMember | null;
  onSave: (data: Omit<TeamMember, "id">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [skillInput, setSkillInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
 
  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          name: initial.name,
          role: initial.role,
          email: initial.email,
          note: initial.note,
          skills: [...initial.skills],
          avatarUrl: initial.avatarUrl,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setSkillInput("");
    }
  }, [open, initial]);
 
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, avatarUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };
 
  const addSkill = useCallback(() => {
    const s = skillInput.trim();
    if (!s || form.skills.includes(s) || form.skills.length >= 8) return;
    setForm((f) => ({ ...f, skills: [...f.skills, s] }));
    setSkillInput("");
  }, [skillInput, form.skills]);
 
  const removeSkill = (skill: string) =>
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));
 
  const canSave = form.name.trim() && form.role.trim() && form.email.trim();
 
  const handleSave = () => {
    if (!canSave) return;
    onSave(form);
  };
 
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
        </DialogHeader>
 
        <div className="space-y-4 py-2">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              {form.avatarUrl ? (
                <img
                  src={form.avatarUrl}
                  alt="Preview"
                  className="h-20 w-20 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className={`h-20 w-20 rounded-full flex items-center justify-center text-white text-2xl font-semibold ${colorForName(form.name || "?")}`}>
                  {initials(form.name) || "?"}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow"
                aria-label="Upload photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload photo or initials will be used
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhoto}
            />
          </div>
 
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tm-name">Full Name *</Label>
            <Input
              id="tm-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Jane Smith"
            />
          </div>
 
          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="tm-role">Company Role / Title *</Label>
            <Input
              id="tm-role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="HR Manager"
            />
          </div>
 
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="tm-email">Email Address *</Label>
            <Input
              id="tm-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="jane@company.com"
            />
          </div>
 
          {/* Skills */}
          <div className="space-y-1.5">
            <Label htmlFor="tm-skill">
              Skills & Responsibilities
              <span className="text-muted-foreground font-normal ml-1">
                (up to 8)
              </span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="tm-skill"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addSkill(); }
                }}
                placeholder="e.g. Event Planning"
                disabled={form.skills.length >= 8}
              />
              <Button
                variant="outline"
                onClick={addSkill}
                disabled={!skillInput.trim() || form.skills.length >= 8}
              >
                Add
              </Button>
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1 pr-1">
                    {s}
                    <button onClick={() => removeSkill(s)} aria-label={`Remove ${s}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
 
          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="tm-note">CSR Program Role Note</Label>
            <Textarea
              id="tm-note"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="What will this person's role be in the CSR program? (optional)"
              rows={3}
            />
          </div>
        </div>
 
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {initial ? "Save Changes" : "Add Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
 
// ─── Invite Team Member modal ───────────────────────────────────────────────

function InviteModal({
  open,
  companyId,
  onClose,
}: {
  open: boolean;
  companyId: string | null;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [sending, setSending] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<{ email: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setRole("member");
      setCreatedInvite(null);
      setCopied(false);
    }
  }, [open]);

  async function handleSendInvite() {
    if (!email.trim() || !companyId) return;
    setSending(true);
    try {
      const token = crypto.randomUUID();
      const { error } = await supabase.from("invites").insert({
        company_id: companyId,
        email: email.trim(),
        role,
        token,
        accepted: false,
      });
      if (error) throw error;

      const inviteUrl = `${window.location.origin}/signup?token=${token}`;
      setCreatedInvite({ email: email.trim(), url: inviteUrl });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create invite");
    } finally {
      setSending(false);
    }
  }

  async function handleCopyLink() {
    if (!createdInvite) return;
    try {
      await navigator.clipboard.writeText(createdInvite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        {createdInvite ? (
          <>
            <DialogHeader>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
                <DialogTitle>Invite created for {createdInvite.email}!</DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={createdInvite.url}
                  onFocus={(e) => e.target.select()}
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCopyLink()}
                  className="flex-shrink-0"
                >
                  {copied ? "Copied! ✓" : "Copy Link"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with {createdInvite.email} via email, Slack, or any other channel.
                The link expires when used.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={onClose} className="w-full">Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email address *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => void handleSendInvite()} disabled={!email.trim() || sending}>
                {sending ? "Sending…" : "Send Invite"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Team() {
  const { userProfile, company } = useAuth();
  // Show by default (including while userProfile hasn't loaded yet) — only
  // hide once we know for certain the role is "member".
  const isAdmin = userProfile?.role !== "member";
  const [members, setMembers] = useState<TeamMember[]>(loadMembers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Persist on every change
  useEffect(() => { saveMembers(members); }, [members]);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (m: TeamMember) => { setEditing(m); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };
 
  const handleSave = (data: Omit<TeamMember, "id">) => {
    if (editing) {
      setMembers((prev) => prev.map((m) => m.id === editing.id ? { ...m, ...data } : m));
    } else {
      setMembers((prev) => [{ id: createId(), ...data }, ...prev]);
    }
    closeModal();
  };
 
  const handleDelete = (id: string) => {
    if (confirm("Remove this team member?")) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
    }
  };
 
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-1">Your Team</h1>
          <p className="text-muted-foreground">
            {members.length === 0
              ? "Add the people who will help run your CSR programs."
              : `${members.length} team member${members.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {members.length > 0 && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => setInviteOpen(true)}>
                <Mail className="h-4 w-4 mr-2" />
                Invite Team Member
              </Button>
            )}
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </div>
        )}
      </div>
 
      {/* Content */}
      {members.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <MemberCard key={m.id} member={m} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}
 
      {/* Modal */}
      <MemberModal
        open={modalOpen}
        initial={editing}
        onSave={handleSave}
        onClose={closeModal}
      />
      <InviteModal
        open={inviteOpen}
        companyId={company?.id ?? null}
        onClose={() => setInviteOpen(false)}
      />
    </div>
  );
}
 