"use client";
import { useUniverse } from "../store/useUniverse";
import { RoleTags } from "./RoleTags";

export const CONTACT_URL = "https://github.com/VynnLockwood";
const ROLE_LINE = "Backend, data and AI engineer who builds quiet tools.";

/** List view: a friendly hero. 3D view: a slim bar, so the sky stays the star. */
export function Header({ webgl = true }: { webgl?: boolean }) {
  const view = useUniverse((s) => s.view);
  const setView = useUniverse((s) => s.setView);
  const in3d = view === "3d";
  const toggle = (
    <button
      className="btn btn-primary"
      type="button"
      aria-disabled={!in3d && !webgl ? true : undefined}
      aria-describedby={!in3d && !webgl ? "no3d" : undefined}
      onClick={() => { if (in3d || webgl) setView(in3d ? "list" : "3d"); }}
    >
      {in3d ? "Back to list" : "Explore in 3D"}
    </button>
  );
  const contact = (
    <a className="btn" href={CONTACT_URL} target="_blank" rel="noopener">
      Say hi
    </a>
  );
  const brand = (
    <div className="brandline">
      <img className="mark" src="/vynn-logo.png" alt="" width={44} height={44} />
      <div className="word">VynnLockwood<small>by Myths of the Moon</small></div>
    </div>
  );

  if (in3d) {
    return (
      <header className="header">
        <div>
          {brand}
          <p className="role-line">{ROLE_LINE}</p>
        </div>
        <RoleTags />
        <div className="actions" key="actions">{toggle}{contact}</div>
      </header>
    );
  }
  return (
    <header className="header hero">
      {brand}
      <h1>Hey, I&apos;m <span className="grad">Vynn.</span></h1>
      <p className="hero-sub">Welcome to my universe, hope you enjoy the exploring.</p>
      <p className="role-line">{ROLE_LINE}</p>
      <div className="actions" key="actions">{toggle}{contact}</div>
      {!webgl && <p id="no3d" className="note">3D needs WebGL, which this browser does not have.</p>}
      <div className="filter">
        <span>Show me:</span>
        <RoleTags />
      </div>
    </header>
  );
}
