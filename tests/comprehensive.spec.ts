/**
 * Comprehensive tests covering all fixes and edge cases.
 * Tests every point of the package to ensure correctness.
 */
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, ref } from "vue";

// Core
import {
  clearPermissionCache,
  getCachedPermission,
  invalidateCache,
  setCachedPermission,
} from "../src/core/cache";
import {
  configurePermission,
  getCurrentPermissions,
  getReactivePermissions,
  isDevMode,
} from "../src/core/config";
import { checkPermissionSync, hasPermission } from "../src/core/evaluator";

// Composable
import { usePermission } from "../src/composables/usePermission";

// Helpers
import {
  isPermissionObject,
  normalizePermissions,
  sortUniq,
  stableStringify,
} from "../src/utils/helpers";

// Storage
import {
  clearPermissionsFromStorage,
  getPermissionsFromStorage,
  savePermissionsToStorage,
} from "../src/utils/storage";

// Guards
import { createPermissionGuard } from "../src/guards/createGuard";

// Plugin
import PermissionPlugin from "../src/plugin";

// Types
import type {
  PermissionMode,
  PermissionObject,
  PermissionValue,
} from "../src/types";

// ═══════════════════════════════════════════════════════════════
// 1. PermissionObject type export
// ═══════════════════════════════════════════════════════════════
describe("PermissionObject type", () => {
  it("is usable as a type annotation", () => {
    const obj: PermissionObject = {
      permissions: ["admin", "editor"],
      mode: "and",
    };
    expect(obj.permissions).toEqual(["admin", "editor"]);
    expect(obj.mode).toBe("and");
  });

  it("works with all valid modes", () => {
    const modes: PermissionMode[] = [
      "and",
      "or",
      "not",
      "startWith",
      "endWith",
      "regex",
    ];
    modes.forEach((mode) => {
      const obj: PermissionObject = { permissions: ["test"], mode };
      expect(obj.mode).toBe(mode);
    });
  });

  it("is assignable to PermissionValue", () => {
    const obj: PermissionObject = {
      permissions: ["perm1"],
      mode: "or",
    };
    const value: PermissionValue = obj;
    expect(value).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. hasPermission alias in usePermission composable
// ═══════════════════════════════════════════════════════════════
describe("usePermission hasPermission alias", () => {
  beforeEach(() => {
    clearPermissionCache();
    localStorage.clear();
    configurePermission(["user.view", "post.edit", "admin.dashboard"]);
  });

  afterEach(() => {
    clearPermissionCache();
    localStorage.clear();
  });

  it("exposes hasPermission as an alias for can()", () => {
    const result = usePermission();
    expect(result.hasPermission).toBeDefined();
    expect(typeof result.hasPermission).toBe("function");
  });

  it("hasPermission returns same result as can()", async () => {
    const { can, hasPermission: hp } = usePermission();

    const canResult = await can("user.view");
    const hpResult = await hp("user.view");
    expect(canResult).toBe(hpResult);
    expect(canResult).toBe(true);
  });

  it("hasPermission works with string permission", async () => {
    const { hasPermission: hp } = usePermission();
    expect(await hp("user.view")).toBe(true);
    expect(await hp("nonexistent")).toBe(false);
  });

  it("hasPermission works with array permission", async () => {
    const { hasPermission: hp } = usePermission();
    expect(await hp(["user.view", "nonexistent"])).toBe(true);
    expect(await hp(["none1", "none2"])).toBe(false);
  });

  it("hasPermission works with object permission", async () => {
    const { hasPermission: hp } = usePermission();
    expect(
      await hp({ permissions: ["user.view", "post.edit"], mode: "and" }),
    ).toBe(true);
    expect(
      await hp({ permissions: ["user.view", "nonexistent"], mode: "and" }),
    ).toBe(false);
  });

  it("hasPermission works with wildcard", async () => {
    const { hasPermission: hp } = usePermission();
    expect(await hp("*")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. canSync all modes (startWith, endWith, regex)
// ═══════════════════════════════════════════════════════════════
describe("canSync full mode support", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission([
      "user.view",
      "user.edit",
      "post.create",
      "post.delete",
      "admin.dashboard",
    ]);
  });

  afterEach(() => {
    clearPermissionCache();
  });

  it("canSync handles startWith mode", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: ["user"], mode: "startWith" })).toBe(true);
    expect(canSync({ permissions: ["post"], mode: "startWith" })).toBe(true);
    expect(canSync({ permissions: ["nonex"], mode: "startWith" })).toBe(false);
  });

  it("canSync handles endWith mode", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: ["view"], mode: "endWith" })).toBe(true);
    expect(canSync({ permissions: ["edit"], mode: "endWith" })).toBe(true);
    expect(canSync({ permissions: ["dashboard"], mode: "endWith" })).toBe(true);
    expect(canSync({ permissions: ["nonexist"], mode: "endWith" })).toBe(false);
  });

  it("canSync handles regex mode", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: ["^user\\..*"], mode: "regex" })).toBe(true);
    expect(canSync({ permissions: ["^admin\\..*"], mode: "regex" })).toBe(true);
    expect(canSync({ permissions: ["^super\\..*"], mode: "regex" })).toBe(
      false,
    );
  });

  it("canSync regex handles invalid pattern gracefully", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: ["[invalid("], mode: "regex" })).toBe(false);
  });

  it("canSync handles wildcard in object permissions", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: ["*"], mode: "and" })).toBe(true);
    expect(canSync({ permissions: ["*"], mode: "or" })).toBe(true);
  });

  it("canSync handles wildcard in array", () => {
    const { canSync } = usePermission();
    expect(canSync(["nonexistent", "*"])).toBe(true);
  });

  it("canSync handles empty permissions in object", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: [], mode: "and" })).toBe(false);
    expect(canSync({ permissions: [], mode: "or" })).toBe(false);
  });

  it("canSync handles invalid mode", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: ["test"], mode: "invalid" as any })).toBe(
      false,
    );
  });

  it("canSync handles and mode", () => {
    const { canSync } = usePermission();
    expect(
      canSync({ permissions: ["user.view", "user.edit"], mode: "and" }),
    ).toBe(true);
    expect(
      canSync({ permissions: ["user.view", "nonexistent"], mode: "and" }),
    ).toBe(false);
  });

  it("canSync handles or mode", () => {
    const { canSync } = usePermission();
    expect(
      canSync({ permissions: ["user.view", "nonexistent"], mode: "or" }),
    ).toBe(true);
    expect(canSync({ permissions: ["nope1", "nope2"], mode: "or" })).toBe(
      false,
    );
  });

  it("canSync handles not mode", () => {
    const { canSync } = usePermission();
    expect(canSync({ permissions: ["nonexistent"], mode: "not" })).toBe(true);
    expect(canSync({ permissions: ["user.view"], mode: "not" })).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. checkPermissionSync function
// ═══════════════════════════════════════════════════════════════
describe("checkPermissionSync", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["read", "write", "manage.users"]);
  });

  it("checks string permission synchronously", () => {
    expect(checkPermissionSync("read")).toBe(true);
    expect(checkPermissionSync("delete")).toBe(false);
  });

  it("checks wildcard", () => {
    expect(checkPermissionSync("*")).toBe(true);
  });

  it("checks array (OR)", () => {
    expect(checkPermissionSync(["read", "unknown"])).toBe(true);
    expect(checkPermissionSync(["unknown1", "unknown2"])).toBe(false);
  });

  it("checks array with wildcard", () => {
    expect(checkPermissionSync(["unknown", "*"])).toBe(true);
  });

  it("checks object with and mode", () => {
    expect(
      checkPermissionSync({ permissions: ["read", "write"], mode: "and" }),
    ).toBe(true);
    expect(
      checkPermissionSync({ permissions: ["read", "delete"], mode: "and" }),
    ).toBe(false);
  });

  it("checks object with or mode", () => {
    expect(
      checkPermissionSync({ permissions: ["read", "delete"], mode: "or" }),
    ).toBe(true);
  });

  it("checks object with not mode", () => {
    expect(checkPermissionSync({ permissions: ["delete"], mode: "not" })).toBe(
      true,
    );
    expect(checkPermissionSync({ permissions: ["read"], mode: "not" })).toBe(
      false,
    );
  });

  it("checks object with startWith mode", () => {
    expect(
      checkPermissionSync({ permissions: ["manage"], mode: "startWith" }),
    ).toBe(true);
    expect(
      checkPermissionSync({ permissions: ["admin"], mode: "startWith" }),
    ).toBe(false);
  });

  it("checks object with endWith mode", () => {
    expect(
      checkPermissionSync({ permissions: ["users"], mode: "endWith" }),
    ).toBe(true);
    expect(
      checkPermissionSync({ permissions: ["admins"], mode: "endWith" }),
    ).toBe(false);
  });

  it("checks object with regex mode", () => {
    expect(
      checkPermissionSync({ permissions: ["^manage\\..*"], mode: "regex" }),
    ).toBe(true);
    expect(
      checkPermissionSync({ permissions: ["^admin\\..*"], mode: "regex" }),
    ).toBe(false);
  });

  it("handles invalid regex in sync", () => {
    expect(
      checkPermissionSync({ permissions: ["[invalid("], mode: "regex" }),
    ).toBe(false);
  });

  it("handles invalid mode in sync", () => {
    expect(
      checkPermissionSync({
        permissions: ["read"],
        mode: "badmode" as any,
      }),
    ).toBe(false);
  });

  it("handles empty permissions array", () => {
    expect(checkPermissionSync({ permissions: [], mode: "and" })).toBe(false);
  });

  it("handles wildcard in object permissions", () => {
    expect(checkPermissionSync({ permissions: ["*"], mode: "and" })).toBe(true);
  });

  it("accepts custom user permissions", () => {
    expect(checkPermissionSync("custom", ["custom", "other"])).toBe(true);
    expect(checkPermissionSync("custom", ["other"])).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(checkPermissionSync(null as any)).toBe(false);
    expect(checkPermissionSync(undefined as any)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. isPermissionObject type guard with unknown input
// ═══════════════════════════════════════════════════════════════
describe("isPermissionObject type guard", () => {
  it("accepts valid objects", () => {
    expect(isPermissionObject({ permissions: ["perm"], mode: "and" })).toBe(
      true,
    );
  });

  it("rejects null", () => {
    expect(isPermissionObject(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isPermissionObject(undefined)).toBe(false);
  });

  it("rejects numbers", () => {
    expect(isPermissionObject(42 as any)).toBe(false);
  });

  it("rejects booleans", () => {
    expect(isPermissionObject(true as any)).toBe(false);
  });

  it("rejects strings", () => {
    expect(isPermissionObject("admin" as any)).toBe(false);
  });

  it("rejects arrays", () => {
    expect(isPermissionObject(["admin"] as any)).toBe(false);
  });

  it("rejects objects missing permissions field", () => {
    expect(isPermissionObject({ mode: "and" } as any)).toBe(false);
  });

  it("rejects objects missing mode field", () => {
    expect(isPermissionObject({ permissions: ["admin"] } as any)).toBe(false);
  });

  it("accepts objects with extra fields", () => {
    expect(
      isPermissionObject({
        permissions: ["a"],
        mode: "or",
        extra: true,
      } as any),
    ).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. Cache invalidation
// ═══════════════════════════════════════════════════════════════
describe("Cache invalidation (invalidateCache)", () => {
  beforeEach(() => {
    clearPermissionCache();
  });

  it("removes expired entries", () => {
    vi.useFakeTimers();

    setCachedPermission("old", true);
    vi.advanceTimersByTime(5 * 60 * 1000 + 1); // Past TTL

    setCachedPermission("fresh", false);

    invalidateCache();

    expect(getCachedPermission("old")).toBeNull();
    expect(getCachedPermission("fresh")).toBe(false);

    vi.useRealTimers();
  });

  it("keeps fresh entries", () => {
    vi.useFakeTimers();

    setCachedPermission("a", true);
    setCachedPermission("b", false);

    vi.advanceTimersByTime(60 * 1000); // 1 minute - well within TTL

    invalidateCache();

    expect(getCachedPermission("a")).toBe(true);
    expect(getCachedPermission("b")).toBe(false);

    vi.useRealTimers();
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. Reactive permissions (getReactivePermissions)
// ═══════════════════════════════════════════════════════════════
describe("Reactive permissions from config", () => {
  beforeEach(() => {
    clearPermissionCache();
  });

  it("returns a ref that updates when configurePermission is called", () => {
    configurePermission(["initial"]);
    const reactive = getReactivePermissions();
    expect(reactive.value).toEqual(["initial"]);

    configurePermission(["updated1", "updated2"]);
    expect(reactive.value).toEqual(["updated1", "updated2"]);
  });

  it("reactive ref reflects empty array", () => {
    configurePermission([]);
    const reactive = getReactivePermissions();
    expect(reactive.value).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. Storage roundtrip with various data
// ═══════════════════════════════════════════════════════════════
describe("Storage roundtrip", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("roundtrips empty array", () => {
    savePermissionsToStorage([]);
    expect(getPermissionsFromStorage()).toEqual([]);
  });

  it("roundtrips large permission sets", () => {
    const perms = Array.from({ length: 500 }, (_, i) => `perm.${i}`);
    savePermissionsToStorage(perms);
    expect(getPermissionsFromStorage()).toEqual(perms);
  });

  it("roundtrips special characters", () => {
    const perms = ["perm@domain.com", "user#123", "a&b=c"];
    savePermissionsToStorage(perms);
    expect(getPermissionsFromStorage()).toEqual(perms);
  });

  it("roundtrips unicode", () => {
    const perms = ["用户.查看", "админ.доступ", "éditer"];
    savePermissionsToStorage(perms);
    expect(getPermissionsFromStorage()).toEqual(perms);
  });

  it("clearPermissionsFromStorage removes data", () => {
    savePermissionsToStorage(["test"]);
    expect(getPermissionsFromStorage()).toEqual(["test"]);
    clearPermissionsFromStorage();
    expect(getPermissionsFromStorage()).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. Plugin installation
// ═══════════════════════════════════════════════════════════════
describe("Plugin installation", () => {
  beforeEach(() => {
    clearPermissionCache();
    localStorage.clear();
  });

  afterEach(() => {
    clearPermissionCache();
    localStorage.clear();
  });

  it("installs with permissions and registers directive", async () => {
    // createApp already imported at top
    const app = createApp({});
    await app.use(PermissionPlugin, {
      permissions: ["test.perm"],
    });
    expect(getCurrentPermissions()).toContain("test.perm");
    expect(app._context.directives).toHaveProperty("permission");
  });

  it("installs with developmentMode on", async () => {
    // createApp already imported at top
    const app = createApp({});
    await app.use(PermissionPlugin, {
      permissions: ["dev"],
      developmentMode: true,
    });
    expect(isDevMode()).toBe(true);
  });

  it("falls back to storage when no permissions provided", async () => {
    savePermissionsToStorage(["from.storage"]);
    // createApp already imported at top
    const app = createApp({});
    await app.use(PermissionPlugin, {});
    expect(getCurrentPermissions()).toContain("from.storage");
  });

  it("persists permissions to storage by default", async () => {
    // createApp already imported at top
    const app = createApp({});
    await app.use(PermissionPlugin, {
      permissions: ["persisted_perm"],
    });
    const stored = getPermissionsFromStorage();
    expect(stored).toContain("persisted_perm");
  });

  it("does not persist when persist: false", async () => {
    localStorage.clear();
    // createApp already imported at top
    const app = createApp({});
    await app.use(PermissionPlugin, {
      permissions: ["no_persist"],
      persist: false,
    });
    const stored = getPermissionsFromStorage();
    expect(stored).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// 10. Directive tests with the plugin (no console.log noise)
// ═══════════════════════════════════════════════════════════════
describe("v-permission directive (no console.log noise)", () => {
  beforeEach(() => {
    clearPermissionCache();
  });

  afterEach(() => {
    clearPermissionCache();
  });

  it("renders element when user has permission", () => {
    const consoleSpy = vi.spyOn(console, "log");
    const wrapper = mount(
      { template: `<div v-permission="'view'">Visible</div>` },
      {
        global: {
          plugins: [[PermissionPlugin, { permissions: ["view"] }]],
        },
      },
    );
    expect(wrapper.html()).toContain("Visible");
    // Should NOT have console.log with "[v-permission:mounted]"
    const mountedLogs = consoleSpy.mock.calls.filter(
      (call) =>
        typeof call[0] === "string" &&
        call[0].includes("[v-permission:mounted]"),
    );
    expect(mountedLogs.length).toBe(0);
    consoleSpy.mockRestore();
  });

  it("removes element when user lacks permission", () => {
    const wrapper = mount(
      { template: `<div v-permission="'forbidden'">Secret</div>` },
      {
        global: {
          plugins: [[PermissionPlugin, { permissions: ["view"] }]],
        },
      },
    );
    // Element is removed from DOM — parentNode becomes null
    expect((wrapper.element as any).parentNode).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// 11. usePermission setPermissions + refresh interaction
// ═══════════════════════════════════════════════════════════════
describe("usePermission setPermissions and refresh", () => {
  beforeEach(() => {
    clearPermissionCache();
    localStorage.clear();
    configurePermission([]);
  });

  afterEach(() => {
    clearPermissionCache();
    localStorage.clear();
  });

  it("setPermissions updates can/hasPermission results", async () => {
    const { can, hasPermission: hp, setPermissions } = usePermission();

    setPermissions(["perm.a", "perm.b"]);
    expect(await can("perm.a")).toBe(true);
    expect(await hp("perm.a")).toBe(true);
    expect(await can("perm.c")).toBe(false);
  });

  it("setPermissions persists to storage", () => {
    const { setPermissions } = usePermission();
    setPermissions(["saved.perm"]);
    const stored = getPermissionsFromStorage();
    expect(stored).toContain("saved.perm");
  });

  it("refresh reloads from global config", () => {
    configurePermission(["global.perm"]);
    const { permissions, refresh } = usePermission();
    expect(permissions.value).toEqual(["global.perm"]);

    configurePermission(["new.global"]);
    refresh();
    expect(permissions.value).toEqual(["new.global"]);
  });

  it("refresh after setPermissions clears local changes", () => {
    configurePermission(["global.perm"]);
    const { permissions, setPermissions, refresh } = usePermission();

    setPermissions(["local.perm"]);
    expect(permissions.value).toEqual(["local.perm"]);

    // Refresh goes back to global config
    configurePermission(["refreshed.perm"]);
    refresh();
    expect(permissions.value).toEqual(["refreshed.perm"]);
  });
});

// ═══════════════════════════════════════════════════════════════
// 12. normalizePermissions edge cases
// ═══════════════════════════════════════════════════════════════
describe("normalizePermissions edge cases", () => {
  it("handles ref<string[]> input", () => {
    const r = ref(["a", "b"]);
    expect(normalizePermissions(r)).toEqual(["a", "b"]);
  });

  it("handles empty ref", () => {
    const r = ref<string[]>([]);
    expect(normalizePermissions(r)).toEqual([]);
  });

  it("filters empty strings", () => {
    expect(normalizePermissions(["perm", "", "other"])).toEqual([
      "perm",
      "other",
    ]);
  });

  it("handles non-array value from ref (edge case)", () => {
    // Even though type says string[], what if ref has a non-array?
    const r = ref("notarray" as any);
    expect(normalizePermissions(r as any)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// 13. stableStringify consistency
// ═══════════════════════════════════════════════════════════════
describe("stableStringify cache key consistency", () => {
  it("generates same key for permission checks with same data", () => {
    const key1 = stableStringify({
      permissionValue: { permissions: ["b", "a"], mode: "and" },
      current: ["x", "y"],
    });
    const key2 = stableStringify({
      permissionValue: { mode: "and", permissions: ["b", "a"] },
      current: ["x", "y"],
    });
    expect(key1).toBe(key2);
  });

  it("generates different keys for different permissions", () => {
    const key1 = stableStringify({
      permissionValue: "admin",
      current: ["admin"],
    });
    const key2 = stableStringify({
      permissionValue: "user",
      current: ["admin"],
    });
    expect(key1).not.toBe(key2);
  });
});

// ═══════════════════════════════════════════════════════════════
// 14. hasPermission with all modes
// ═══════════════════════════════════════════════════════════════
describe("hasPermission all modes coverage", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission([
      "user.view",
      "user.edit",
      "post.create",
      "admin.settings",
    ]);
  });

  it("and mode: true when all match", async () => {
    expect(
      await hasPermission({
        permissions: ["user.view", "user.edit"],
        mode: "and",
      }),
    ).toBe(true);
  });

  it("and mode: false when any missing", async () => {
    expect(
      await hasPermission({
        permissions: ["user.view", "missing"],
        mode: "and",
      }),
    ).toBe(false);
  });

  it("or mode: true when any match", async () => {
    expect(
      await hasPermission({
        permissions: ["missing", "user.view"],
        mode: "or",
      }),
    ).toBe(true);
  });

  it("or mode: false when none match", async () => {
    expect(await hasPermission({ permissions: ["a", "b"], mode: "or" })).toBe(
      false,
    );
  });

  it("not mode: true when none match", async () => {
    expect(
      await hasPermission({ permissions: ["nonexist"], mode: "not" }),
    ).toBe(true);
  });

  it("not mode: false when any match", async () => {
    expect(
      await hasPermission({ permissions: ["user.view"], mode: "not" }),
    ).toBe(false);
  });

  it("startWith mode", async () => {
    expect(
      await hasPermission({ permissions: ["user."], mode: "startWith" }),
    ).toBe(true);
    expect(
      await hasPermission({ permissions: ["nope."], mode: "startWith" }),
    ).toBe(false);
  });

  it("endWith mode", async () => {
    expect(
      await hasPermission({ permissions: [".view"], mode: "endWith" }),
    ).toBe(true);
    expect(
      await hasPermission({ permissions: [".other"], mode: "endWith" }),
    ).toBe(false);
  });

  it("regex mode", async () => {
    expect(
      await hasPermission({ permissions: ["^user\\..*"], mode: "regex" }),
    ).toBe(true);
    expect(
      await hasPermission({ permissions: ["^xyz\\..*"], mode: "regex" }),
    ).toBe(false);
  });

  it("regex invalid pattern", async () => {
    expect(await hasPermission({ permissions: ["[bad("], mode: "regex" })).toBe(
      false,
    );
  });

  it("invalid mode", async () => {
    expect(
      await hasPermission({
        permissions: ["user.view"],
        mode: "invalid" as any,
      }),
    ).toBe(false);
  });

  it("wildcard string", async () => {
    expect(await hasPermission("*")).toBe(true);
  });

  it("wildcard in array", async () => {
    expect(await hasPermission(["miss", "*"])).toBe(true);
  });

  it("wildcard in object", async () => {
    expect(await hasPermission({ permissions: ["*"], mode: "and" })).toBe(true);
  });

  it("empty array returns false", async () => {
    expect(await hasPermission([])).toBe(false);
  });

  it("empty permissions in object returns false", async () => {
    expect(await hasPermission({ permissions: [], mode: "and" })).toBe(false);
  });

  it("null returns false", async () => {
    expect(await hasPermission(null as any)).toBe(false);
  });

  it("undefined returns false", async () => {
    expect(await hasPermission(undefined as any)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 15. Guards with permission modes
// ═══════════════════════════════════════════════════════════════
describe("Guards with various permission modes", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["user.view", "post.edit"]);
  });

  it("guard checks AND mode permissions", async () => {
    const guard = createPermissionGuard({
      getAuthState: () => ({ isAuthenticated: true }),
    });
    const to = {
      path: "/admin",
      name: "/admin",
      matched: [],
      params: {},
      query: {},
      hash: "",
      fullPath: "/admin",
      meta: {
        checkPermission: true,
        permissions: {
          permissions: ["user.view", "post.edit"],
          mode: "and" as const,
        },
      },
      redirectedFrom: undefined,
    };
    const next = vi.fn();
    await guard(to as any, {} as any, next);
    expect(next).toHaveBeenCalledWith();
  });
});

// ═══════════════════════════════════════════════════════════════
// 16. sortUniq utility
// ═══════════════════════════════════════════════════════════════
describe("sortUniq utility", () => {
  it("removes duplicates and sorts", () => {
    expect(sortUniq(["c", "a", "b", "a"])).toEqual(["a", "b", "c"]);
  });

  it("handles empty", () => {
    expect(sortUniq([])).toEqual([]);
  });

  it("handles single element", () => {
    expect(sortUniq(["only"])).toEqual(["only"]);
  });

  it("handles all duplicates", () => {
    expect(sortUniq(["same", "same", "same"])).toEqual(["same"]);
  });
});

// ═══════════════════════════════════════════════════════════════
// 17. Integration: full workflow
// ═══════════════════════════════════════════════════════════════
describe("Integration: full permission workflow", () => {
  beforeEach(() => {
    clearPermissionCache();
    localStorage.clear();
  });

  afterEach(() => {
    clearPermissionCache();
    localStorage.clear();
  });

  it("full lifecycle: plugin → composable → directive", async () => {
    // createApp already imported at top
    const app = createApp({});
    await app.use(PermissionPlugin, {
      permissions: ["dashboard.view", "users.list"],
    });

    // Composable works
    const { can, canSync, hasPermission: hp, hasAll, hasAny } = usePermission();
    expect(canSync("dashboard.view")).toBe(true);
    expect(canSync("admin.only")).toBe(false);
    expect(await can("users.list")).toBe(true);
    expect(await hp("users.list")).toBe(true);
    expect(await hasAll(["dashboard.view", "users.list"])).toBe(true);
    expect(await hasAll(["dashboard.view", "missing"])).toBe(false);
    expect(await hasAny(["missing", "users.list"])).toBe(true);
    expect(await hasAny(["missing1", "missing2"])).toBe(false);

    // Directive works
    const wrapper = mount(
      {
        template: `
          <div>
            <span v-permission="'dashboard.view'">Dashboard</span>
            <span v-permission="'admin.only'">Admin</span>
          </div>
        `,
      },
      {
        global: {
          plugins: [
            [
              PermissionPlugin,
              { permissions: ["dashboard.view", "users.list"] },
            ],
          ],
        },
      },
    );
    expect(wrapper.html()).toContain("Dashboard");
    expect(wrapper.html()).not.toContain("Admin");
  });
});
