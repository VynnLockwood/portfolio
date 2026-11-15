import { beforeEach, describe, expect, it } from "vitest";
import { FALLBACK_NOTICE, fallbackToList, useUniverse } from "./useUniverse";

beforeEach(() => useUniverse.setState({ view: "3d", notice: null }));

describe("fallbackToList", () => {
  it("switches to the list and sets the notice when 3D fails", () => {
    fallbackToList();
    expect(useUniverse.getState().view).toBe("list");
    expect(useUniverse.getState().notice).toBe(FALLBACK_NOTICE);
  });

  it("shows no error notice when the user already left 3D (worker torn down on purpose)", () => {
    useUniverse.setState({ view: "list" });
    fallbackToList();
    expect(useUniverse.getState().notice).toBeNull();
  });
});
