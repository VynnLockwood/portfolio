"use client";
import { useUniverse } from "../store/useUniverse";
import { RoleTags } from "./RoleTags";

export const CONTACT_URL = "https://github.com/VynnLockwood";

export function Header() {
  const view = useUniverse((s) => s.view);
  const setView = useUniverse((s) => s.setView);
  return (
    <header className="header">
      <div className="brandline">
        <img className="mark" src="/vynn-logo.png" alt="" width={44} height={44} />
        <div>
          <div className="word">VynnLockwood<small>by Myths of the Moon</small></div>
          <p className="role-line">Backend, data and AI engineer who builds quiet tools.</p>
        </div>
      </div>
      <RoleTags />
      <div className="actions">
        <a className="btn" href={CONTACT_URL} target="_blank" rel="noopener">Contact</a>
        <button className="btn" type="button" onClick={() => setView(view === "3d" ? "list" : "3d")}>
          {view === "3d" ? "List view" : "3D view"}
        </button>
      </div>
    </header>
  );
}
