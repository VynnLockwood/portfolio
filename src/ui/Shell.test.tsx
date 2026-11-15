import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../scene/Universe", () => ({ default: () => <div data-testid="universe" /> }));

import { useUniverse } from "../store/useUniverse";
import { RepoList } from "./RepoList";
import { Shell } from "./Shell";

const withWebGL = (on: boolean) => vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(on ? ({} as RenderingContext) : null);

beforeEach(() => {
  useUniverse.setState({ view: "list", role: null, notice: null, hovered: null });
  withWebGL(true);
});
afterEach(() => vi.restoreAllMocks());

describe("Shell", () => {
  it("renders all 9 repo anchors on first render", () => {
    render(<Shell />);
    expect(screen.getAllByRole("link", { name: /.+/ }).filter((a) => a.getAttribute("href")?.includes("github.com/VynnLockwood/") && a.hasAttribute("data-repo"))).toHaveLength(9);
  });

  it("starts in the list view even on a wide screen with WebGL, with a friendly hero and an Explore in 3D button", async () => {
    Object.defineProperty(window, "innerWidth", { value: 1600, configurable: true });
    render(<Shell />);
    await act(async () => {});
    expect(useUniverse.getState().view).toBe("list");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hey, I'm Vynn.");
    expect(screen.getByText("Welcome to my universe, hope you enjoy the exploring.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Explore in 3D" })).toBeEnabled();
    expect(screen.queryByTestId("universe")).not.toBeInTheDocument();
    expect(screen.queryByTestId("welcome")).not.toBeInTheDocument(); // the hero is the greeting in list view
  });

  it("explains itself and disables Explore in 3D when the browser has no WebGL", async () => {
    withWebGL(false);
    render(<Shell />);
    await act(async () => {});
    const b = screen.getByRole("button", { name: "Explore in 3D" });
    expect(b).toHaveAttribute("aria-disabled", "true");
    expect(b).toHaveAccessibleDescription(/WebGL/i); // keyboard, screen reader and touch users get the reason too
    fireEvent.click(b);
    expect(useUniverse.getState().view).toBe("list");
  });

  it("shows the greeting overlay when 3D opens and dismisses it on a key press", async () => {
    render(<Shell />);
    fireEvent.click(screen.getByRole("button", { name: "Explore in 3D" }));
    expect(await screen.findByTestId("universe")).toBeInTheDocument();
    expect(screen.getByText("Welcome to my universe")).toBeInTheDocument();
    expect(screen.getByText("hope you enjoy the exploring")).toBeInTheDocument();
    const welcome = screen.getByTestId("welcome");
    expect(welcome).toHaveAttribute("data-state", "shown");
    fireEvent.keyDown(window, { key: "a" });
    expect(welcome).toHaveAttribute("data-state", "done");
  });

  it("keeps keyboard focus on the toggle when switching list and 3D", async () => {
    render(<Shell />);
    screen.getByRole("button", { name: "Explore in 3D" }).focus();
    fireEvent.click(document.activeElement as HTMLElement);
    await screen.findByTestId("universe");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Back to list" }));
    fireEvent.click(document.activeElement as HTMLElement);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Explore in 3D" }));
  });

  it("does not load the 3D code for the labels on the first (list) render", () => {
    const src = readFileSync(join(__dirname, "Shell.tsx"), "utf8");
    expect(src).not.toMatch(/import\s*\{[^}]*\}\s*from\s*"\.\.\/scene\/Labels"/); // static import would put three.js in the first load
  });

  it("hides a label that is out of view even when it is also dimmed", () => {
    const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
    expect(css).toMatch(/\.body-label\[data-hidden="true"\]\s*\{[^}]*opacity:\s*0\s*!important/);
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

  it("switches between list and 3D, unmounting the canvas in list view", async () => {
    render(<Shell />);
    fireEvent.click(screen.getByRole("button", { name: "Explore in 3D" }));
    expect(useUniverse.getState().view).toBe("3d");
    expect(await screen.findByTestId("universe")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to list" }));
    expect(useUniverse.getState().view).toBe("list");
    expect(screen.queryByTestId("universe")).not.toBeInTheDocument();
  });

  it("the Contact link opens in a new tab safely", () => {
    render(<Shell />);
    const a = screen.getByRole("link", { name: "Say hi" }); // accessible name matches the visible text
    expect(a).toHaveTextContent("Say hi");
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
