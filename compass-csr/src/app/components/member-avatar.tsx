import { colorForName, initials, type TeamMember } from "../lib/team";

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-2xl",
};

export function MemberAvatar({
  member,
  size = "md",
}: {
  member: Pick<TeamMember, "name" | "avatarUrl">;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const sizeClass = SIZE_CLASSES[size];
  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={member.name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} ${colorForName(member.name)} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
    >
      {initials(member.name) || "?"}
    </div>
  );
}

// Convenience variant for when only a name string is available (e.g. an
// assignee name stored on a task, without the full TeamMember record).
export function NameAvatar({ name, size = "sm" }: { name: string; size?: keyof typeof SIZE_CLASSES }) {
  return <MemberAvatar member={{ name, avatarUrl: null }} size={size} />;
}
