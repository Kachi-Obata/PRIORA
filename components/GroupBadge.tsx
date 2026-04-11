import type { Group } from "@/lib/constants";

interface Props {
  group: Group;
}

export default function GroupBadge({ group }: Props) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-sunk border border-black/[0.06] text-ink-muted text-xs font-medium px-2.5 py-1">
      Group {group}
    </span>
  );
}
