import type { Role } from "./types";

export const ROLES: Record<Role, { label: string; color: string; bit: number }> = {
  backend: { label: "Backend", color: "#7FD1FF", bit: 1 },
  data: { label: "Data", color: "#7FFFD4", bit: 2 },
  fullstack: { label: "Full-stack", color: "#FFC15C", bit: 4 },
  ai: { label: "AI", color: "#C79BFF", bit: 8 },
};

export const ROLE_ORDER: Role[] = ["backend", "data", "fullstack", "ai"];

export function roleMask(roles: Role[]): number {
  return roles.reduce((m, r) => m | ROLES[r].bit, 0);
}

function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** WCAG contrast ratio between two #rrggbb colours. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
