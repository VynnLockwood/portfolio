import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import repos from "../data/repos.json";
import { contrastRatio, ROLES } from "../data/roles";
import type { Repo } from "../data/types";
import { RepoList } from "./RepoList";
import { CARD_BG, CARD_SOFT, CARD_TEXT } from "./theme";

const list = repos as Repo[];

describe("RepoList", () => {
  it("renders 9 cards that are links opening in a new tab safely", () => {
    render(<RepoList visible />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(9);
    for (const a of links) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a.getAttribute("rel")).toContain("noopener");
    }
  });
  it("lists the top repo first", () => {
    render(<RepoList visible />);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "https://github.com/VynnLockwood/project-singularity");
    expect(screen.getAllByRole("link")[0]).toHaveTextContent("Singularity");
  });
  it("each card shows its name, blurb, every stack chip and every role chip", () => {
    render(<RepoList visible />);
    const cards = screen.getAllByRole("link");
    list.forEach((r, i) => {
      const text = cards[i].textContent ?? "";
      expect(text).toContain(r.name);
      expect(text).toContain(r.blurb);
      for (const s of r.stack) expect(text).toContain(s);
      for (const role of r.roles) expect(text).toContain(ROLES[role].label);
    });
  });
  it("hides visually but keeps anchors when not visible", () => {
    render(<RepoList visible={false} />);
    expect(screen.getByRole("navigation", { name: "Projects" })).toHaveClass("sr-only-focusable");
    expect(screen.getAllByRole("link")).toHaveLength(9);
  });
  it("card text and every role colour are readable on the card (WCAG AA)", () => {
    expect(contrastRatio(CARD_TEXT, CARD_BG)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(CARD_SOFT, CARD_BG)).toBeGreaterThanOrEqual(4.5);
    for (const r of Object.values(ROLES)) expect(contrastRatio(r.color, CARD_BG)).toBeGreaterThanOrEqual(4.5);
  });
});
