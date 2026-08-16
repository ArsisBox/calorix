import type { Unit } from "@/lib/units";
import { UNIT_TYPE_LABELS } from "@/lib/units";

const selectClass =
  "h-9 w-28 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function UnitSelect({
  units,
  value,
  onChange,
  className,
}: {
  units: Unit[];
  value: string;
  onChange: (unitId: string) => void;
  className?: string;
}) {
  const groups = (["weight", "volume"] as const).map((type) => ({
    type,
    units: units.filter((u) => u.unit_type === type),
  }));

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? selectClass}
    >
      {groups.map(
        (group) =>
          group.units.length > 0 && (
            <optgroup key={group.type} label={UNIT_TYPE_LABELS[group.type]}>
              {group.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.abbreviation})
                </option>
              ))}
            </optgroup>
          ),
      )}
    </select>
  );
}
