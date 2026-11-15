import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RepoList } from "./RepoList";

describe("RepoList", () => {
  it("renders 9 anchors that open in a new tab safely", () => {
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
  it("hides visually but keeps anchors when not visible", () => {
    render(<RepoList visible={false} />);
    expect(screen.getByRole("navigation", { name: "Projects" })).toHaveClass("sr-only-focusable");
    expect(screen.getAllByRole("link")).toHaveLength(9);
  });
});
