import type { GroupMemberInfo } from "@/lib/types";

type MemberPillsProps = {
  members: GroupMemberInfo[];
  maxVisible?: number;
};

function memberLabel(member: GroupMemberInfo): string {
  if (member.username) {
    return `@${member.username}`;
  }
  const first = member.displayName.trim().split(/\s+/)[0];
  return first || "Member";
}

export function MemberPills({ members, maxVisible = 3 }: MemberPillsProps) {
  if (members.length === 0) {
    return null;
  }

  const visible = members.slice(0, maxVisible);
  const overflow = members.length - visible.length;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {visible.map((member) => (
        <li
          key={member.uid}
          className="rounded-full bg-lf-bg-muted px-2.5 py-0.5 text-xs font-medium text-lf-text-secondary"
        >
          {memberLabel(member)}
        </li>
      ))}
      {overflow > 0 && (
        <li className="rounded-full bg-lf-bg-muted px-2.5 py-0.5 text-xs font-medium text-lf-text-secondary">
          +{overflow}
        </li>
      )}
    </ul>
  );
}
