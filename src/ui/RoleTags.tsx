"use client";
import { ROLE_ORDER, ROLES } from "../data/roles";
import { useUniverse } from "../store/useUniverse";

/** Four role buttons. Pressing the active one clears the filter. */
export function RoleTags() {
  const role = useUniverse((s) => s.role);
  const setRole = useUniverse((s) => s.setRole);
  return (
    <div className="role-tags" role="group" aria-label="Show projects by role">
      {ROLE_ORDER.map((r) => (
        <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(role === r ? null : r)} style={{ ["--role" as string]: ROLES[r].color }}>
          {ROLES[r].label}
        </button>
      ))}
    </div>
  );
}
