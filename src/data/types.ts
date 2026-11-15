export type Role = "backend" | "data" | "fullstack" | "ai";

export interface Repo {
  id: string;
  name: string;
  url: string;
  blurb: string;
  roles: Role[];
  stack: string[];
  /** 1 = biggest body */
  rank: number;
}
