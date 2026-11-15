import { describe, expect, it } from "vitest";
import repos from "./repos.json";
import { ROLES, contrastRatio, roleMask } from "./roles";
import type { Repo, Role } from "./types";

const list = repos as Repo[];

describe("repos.json", () => {
  it("has exactly 9 repos", () => expect(list).toHaveLength(9));
  it("has unique ids", () => expect(new Set(list.map((r) => r.id)).size).toBe(9));
  it("links only github.com/VynnLockwood repos", () => {
    for (const r of list) expect(r.url).toMatch(/^https:\/\/github\.com\/VynnLockwood\/[\w.-]+$/);
  });
  it("ranks are exactly 1..9 and the list is ordered by rank", () => {
    expect(list.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it("uses only known roles", () => {
    for (const r of list) for (const role of r.roles) expect(Object.keys(ROLES)).toContain(role as Role);
  });
  it("keeps blurbs short", () => {
    for (const r of list) expect(r.blurb.length).toBeLessThanOrEqual(110);
  });
});

describe("roles", () => {
  it("every role colour has contrast >= 4.5 on the void colour", () => {
    for (const r of Object.values(ROLES)) expect(contrastRatio(r.color, "#05060F")).toBeGreaterThanOrEqual(4.5);
  });
  it("roleMask combines bits", () => {
    expect(roleMask(["ai", "data"])).toBe(10);
    expect(roleMask([])).toBe(0);
  });
});
