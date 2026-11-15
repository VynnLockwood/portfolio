import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../scene/Universe", () => ({ default: () => <div data-testid="universe" /> }));

import { useUniverse } from "../store/useUniverse";
import { RepoList } from "./RepoList";
import { Shell } from "./Shell";

beforeEach(() => {
  useUniverse.setState({ view: "list", role: null, notice: null, hovered: null });
});

describe("Shell", () => {
  it("renders all 9 repo anchors on first render", () => {
    render(<Shell />);
    expect(screen.getAllByRole("link", { name: /.+/ }).filter((a) => a.getAttribute("href")?.includes("github.com/VynnLockwood/") && a.hasAttribute("data-repo"))).toHaveLength(9);
  });

  it("shows the greeting first and dismisses the intro on a key press", () => {
    render(<Shell />);
    expect(screen.getByText("Welcome to my universe")).toBeInTheDocument();
    expect(screen.getByText("hope you enjoy the exploring")).toBeInTheDocument();
    const welcome = screen.getByTestId("welcome");
    expect(welcome).toHaveAttribute("data-state", "shown");
    fireEvent.keyDown(window, { key: "a" });
    expect(welcome).toHaveAttribute("data-state", "done");
  });

  it("shows the role statement", () => {
    render(<Shell />);
    expect(screen.getByText("Backend, data and AI engineer who builds quiet tools.")).toBeInTheDocument();
  });

  it("role tags toggle the role and aria-pressed", () => {
    render(<Shell />);
    const tag = screen.getByRole("button", { name: "Backend" });
    expect(tag).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(tag);
    expect(tag).toHaveAttribute("aria-pressed", "true");
    expect(useUniverse.getState().role).toBe("backend");
    fireEvent.click(tag);
    expect(tag).toHaveAttribute("aria-pressed", "false");
    expect(useUniverse.getState().role).toBeNull();
  });

  it("switches between 3D and list, unmounting the canvas in list view", async () => {
    render(<Shell />);
    act(() => useUniverse.setState({ view: "3d" }));
    expect(await screen.findByTestId("universe")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    expect(useUniverse.getState().view).toBe("list");
    expect(screen.queryByTestId("universe")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "3D view" }));
    expect(useUniverse.getState().view).toBe("3d");
  });

  it("the Contact link opens in a new tab safely", () => {
    render(<Shell />);
    const a = screen.getByRole("link", { name: "Contact" });
    expect(a).toHaveAttribute("href", "https://github.com/VynnLockwood");
    expect(a).toHaveAttribute("target", "_blank");
    expect(a.getAttribute("rel")).toContain("noopener");
  });

  it("announces a notice", () => {
    render(<Shell />);
    act(() => useUniverse.getState().setNotice("3D could not start, showing the list instead."));
    expect(screen.getByRole("status")).toHaveTextContent("showing the list instead");
  });
});

describe("RepoList role dimming", () => {
  it("marks repos without the chosen role as dimmed", () => {
    render(<RepoList visible role="data" />);
    const dim = (id: string) => document.querySelector(`[data-repo="${id}"]`)!.closest("li")!.getAttribute("data-dim");
    expect(dim("ETL-Cleansing-tools")).toBeNull();
    expect(dim("kuronuma")).toBe("true");
  });
});
