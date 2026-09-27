import type { Role } from "@clearwork/shared";
import { describe, expect, it } from "vitest";
import { roleHome } from "../../src/auth/roleHome.js";

describe("roleHome", () => {
  const cases: Array<[Role, string]> = [
    ["worker", "/worker"],
    ["supervisor", "/supervisor"],
    ["admin", "/admin"],
  ];

  it.each(cases)("%s -> %s", (role, expected) => {
    expect(roleHome(role)).toBe(expected);
  });
});
