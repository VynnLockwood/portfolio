import { describe, expect, it } from "vitest";
import repos from "../data/repos.json";
import type { Repo } from "../data/types";
import { bodyRadius, bodyWeight, stepMix, targetMix } from "./Bodies";

const list = repos as Repo[];
const ids = (mix: number[], ...names: string[]) => names.map((n) => mix[list.findIndex((r) => r.id === n)]);

/** Run `ms` of time in 16 ms frames, updating `mix` toward `target`. */
function run(mix: number[], target: number[], ms: number) {
  for (let t = 0; t < ms; t += 16) stepMix(mix, target, 16);
  return mix;
}

describe("body sizing", () => {
  it("radius is strictly decreasing with rank, from 4.0 down to 1.5", () => {
    const r = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(bodyRadius);
    for (let i = 1; i < r.length; i++) expect(r[i]).toBeLessThan(r[i - 1]);
    expect(r[0]).toBeCloseTo(4.0);
    expect(r[8]).toBeCloseTo(1.5);
  });
  it("weight follows 1 - 0.07 * (rank - 1), the same formula the Rust layout tests use", () => {
    expect(bodyWeight(1)).toBe(1);
    expect(bodyWeight(9)).toBeCloseTo(0.44);
  });
});

describe("role filter mix", () => {
  it("targets 1 for repos with the role and 0.15 for the rest", () => {
    const m = targetMix("data", list);
    expect(ids(m, "project-singularity", "cosmic-webs", "ETL-Cleansing-tools")).toEqual([1, 1, 1]);
    expect(ids(m, "kuronuma", "ma-ieat", "Salmon.myths")).toEqual([0.15, 0.15, 0.15]);
  });
  it("targets all 1 when no role is chosen", () => {
    expect(targetMix(null, list)).toEqual(Array(9).fill(1));
  });
  it("eases to within 0.02 of the target after 700 ms", () => {
    const target = targetMix("ai", list);
    const mix = run(Array(9).fill(1), target, 700);
    mix.forEach((v, i) => expect(Math.abs(v - target[i])).toBeLessThan(0.02));
  });
  it("last choice wins when tags are toggled quickly: nothing is left dimmed", () => {
    const mix: number[] = Array(9).fill(1);
    run(mix, targetMix("ai", list), 100);
    run(mix, targetMix("backend", list), 100);
    run(mix, targetMix(null, list), 1000);
    mix.forEach((v) => expect(Math.abs(v - 1)).toBeLessThan(0.02));
  });
});
