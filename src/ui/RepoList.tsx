import repos from "../data/repos.json";
import { ROLES } from "../data/roles";
import type { Repo, Role } from "../data/types";

const list = repos as Repo[];

/** Cards for the repos, always in the page (SEO and screen readers). Visually hidden, but tabbable, while the 3D view is on. */
export function RepoList({ visible, role = null }: { visible: boolean; role?: Role | null }) {
  return (
    <nav aria-label="Projects" className={visible ? "repo-list" : "repo-list sr-only-focusable"}>
      <ul>
        {list.map((r) => (
          <li key={r.id} data-dim={role && !r.roles.includes(role) ? "true" : undefined}>
            <a href={r.url} target="_blank" rel="noopener" data-repo={r.id} style={{ ["--role" as string]: ROLES[r.roles[0]].color }}>
              <span className="card-top">
                <span className="repo-name">{r.name}</span>
                <span className="repo-arrow" aria-hidden="true">↗</span>
              </span>
              <span className="repo-blurb">{r.blurb}</span>
              <span className="chips">
                {r.stack.map((t) => (
                  <span key={t} className="chip">{t}</span>
                ))}
              </span>
              <span className="repo-roles">
                {r.roles.map((role) => (
                  <span key={role} className="role-chip" style={{ color: ROLES[role].color }}>{ROLES[role].label}</span>
                ))}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
