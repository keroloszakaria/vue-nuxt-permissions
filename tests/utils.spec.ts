import { describe, expect, it } from "vitest";
import { hasPermission } from "../src/core/evaluator";
import type { PermissionValue } from "../src/types";

describe("hasPermission()", () => {
  it("matches simple permission", async () => {
    const result = await hasPermission("user.view", ["user.view"]);
    expect(result).toBe(true);
  });

  it("fails missing permission", async () => {
    const result = await hasPermission("admin.panel", ["user.view"]);
    expect(result).toBe(false);
  });

  it("supports regex mode", async () => {
    const regexPermission: PermissionValue = {
      permissions: ["^admin\\."],
      mode: "regex",
    };
    const result = await hasPermission(regexPermission, ["admin.users"]);
    expect(result).toBe(true);
  });
});
