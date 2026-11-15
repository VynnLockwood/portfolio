import repos from "../data/repos.json";
import { ROLES } from "../data/roles";
import type { Repo } from "../data/types";

const list = repos as Repo[];

/** Plain HTML list of the repos, always in the page. Visually hidden (but tabbable) while the 3D view is on. */
export function RepoList({ visible }: { visible: boolean }) {
  return (
    <nav aria-label="Projects" className={visible ? "repo-list" : "repo-list sr-only-focusable"}>
      <ul>
        {list.map((r) => (
          <li key={r.id}>
            <a href={r.url} target="_blank" rel="noopener" data-repo={r.id}>
              <span className="repo-name">{r.name}</span>
              <span className="repo-blurb">{r.blurb}</span>
              <span className="repo-roles">
                {r.roles.map((role) => (
                  <span key={role} style={{ color: ROLES[role].color }}>{ROLES[role].label}</span>
                ))}
              </span>
              <span className="repo-arrow" aria-hidden="true">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
