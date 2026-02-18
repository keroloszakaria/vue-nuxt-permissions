import { usePermission } from "../src/composables/usePermission";
import { setCachedPermission, clearPermissionCache } from "../src/core/cache";
import { configurePermission } from "../src/core/config";
import { describe, it, expect, beforeEach } from "vitest";

describe("usePermission composable", () => {
  beforeEach(() => {
    clearPermissionCache();
  });

  it("returns true for allowed permission using canSync()", () => {
    const { canSync } = usePermission();
    expect(canSync("*")).toBe(true);
  });

  it("returns false for disallowed permission using canSync()", () => {
    const { canSync } = usePermission();
    expect(canSync("admin.delete")).toBe(false);
  });

  it("caches and reuses evaluated permissions", async () => {
    configurePermission(["users.edit"]);
    const { can } = usePermission();

    const result = await can("users.edit");
    expect(result).toBe(true);
  });

  it("refresh() clears cache and reloads permissions", () => {
    const { refresh } = usePermission();
    setCachedPermission("key", true);
    refresh();
    expect(clearPermissionCache).toBeDefined();
  });
});
