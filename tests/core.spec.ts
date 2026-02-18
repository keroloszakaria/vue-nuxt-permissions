import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  configurePermission,
  getCurrentPermissions,
  isDevMode,
} from "../src/core/config";
import {
  clearPermissionCache,
  getCachedPermission,
  setCachedPermission,
} from "../src/core/cache";
import { ref } from "vue";

describe("Core Configuration (config.ts)", () => {
  beforeEach(() => {
    clearPermissionCache();
  });

  describe("configurePermission", () => {
    it("initializes permissions correctly with string array", () => {
      const permissions = ["user.view", "user.edit", "admin.access"];
      configurePermission(permissions);

      const current = getCurrentPermissions();
      expect(current).toEqual(permissions);
    });

    it("initializes permissions correctly with reactive ref", () => {
      const permissionRef = ref(["dashboard.view", "reports.view"]);
      configurePermission(permissionRef);

      const current = getCurrentPermissions();
      expect(current).toEqual(["dashboard.view", "reports.view"]);
    });

    it("re-configuring overrides old permissions", () => {
      configurePermission(["old.permission"]);
      expect(getCurrentPermissions()).toEqual(["old.permission"]);

      configurePermission(["new.permission", "another.permission"]);
      expect(getCurrentPermissions()).toEqual([
        "new.permission",
        "another.permission",
      ]);
    });

    it("sets development mode when provided", () => {
      configurePermission(["admin"], { developmentMode: true });
      expect(isDevMode()).toBe(true);

      configurePermission(["user"], { developmentMode: false });
      expect(isDevMode()).toBe(false);
    });

    it("defaults to developmentMode false when not specified", () => {
      configurePermission(["test"]);
      expect(isDevMode()).toBe(false);
    });

    it("handles empty permissions array", () => {
      configurePermission([]);
      expect(getCurrentPermissions()).toEqual([]);
    });
  });

  describe("getCurrentPermissions", () => {
    it("returns empty permissions when not configured", () => {
      // Reset to unconfigured state
      configurePermission(null as any);
      const current = getCurrentPermissions();
      expect(current).toEqual([]);
    });

    it("returns configured string array permissions", () => {
      const permissions = ["permission1", "permission2"];
      configurePermission(permissions);
      expect(getCurrentPermissions()).toEqual(permissions);
    });

    it("extracts value from reactive ref permissions", () => {
      const permissionsRef = ref(["ref.permission1", "ref.permission2"]);
      configurePermission(permissionsRef);

      const current = getCurrentPermissions();
      expect(current).toEqual(["ref.permission1", "ref.permission2"]);
    });

    it("updates when ref value changes (reactivity)", () => {
      const permissionsRef = ref(["initial"]);
      configurePermission(permissionsRef);

      expect(getCurrentPermissions()).toEqual(["initial"]);

      permissionsRef.value = ["updated", "permissions"];
      expect(getCurrentPermissions()).toEqual(["updated", "permissions"]);
    });

    it("handles null permissions configuration safely", () => {
      configurePermission(null as any);
      expect(getCurrentPermissions()).toEqual([]);
    });
  });

  describe("isDevMode", () => {
    it("returns false by default", () => {
      configurePermission(["test"]);
      expect(isDevMode()).toBe(false);
    });

    it("returns true when development mode is enabled", () => {
      configurePermission(["test"], { developmentMode: true });
      expect(isDevMode()).toBe(true);
    });

    it("can be toggled by reconfiguring", () => {
      configurePermission(["test"], { developmentMode: true });
      expect(isDevMode()).toBe(true);

      configurePermission(["test"], { developmentMode: false });
      expect(isDevMode()).toBe(false);
    });
  });
});

describe("Permission Cache (cache.ts)", () => {
  beforeEach(() => {
    clearPermissionCache();
  });

  describe("setCachedPermission & getCachedPermission", () => {
    it("stores and retrieves cached permissions", () => {
      const key = "test.permission";
      setCachedPermission(key, true);

      const cached = getCachedPermission(key);
      expect(cached).toBe(true);
    });

    it("returns null for uncached permissions", () => {
      const cached = getCachedPermission("non.existent");
      expect(cached).toBeNull();
    });

    it("stores both true and false values correctly", () => {
      setCachedPermission("allowed", true);
      setCachedPermission("denied", false);

      expect(getCachedPermission("allowed")).toBe(true);
      expect(getCachedPermission("denied")).toBe(false);
    });

    it("handles multiple cache entries", () => {
      const entries = [
        ["perm1", true],
        ["perm2", false],
        ["perm3", true],
        ["perm4", false],
      ];

      entries.forEach(([key, value]) => {
        setCachedPermission(key as string, value as boolean);
      });

      entries.forEach(([key, value]) => {
        expect(getCachedPermission(key as string)).toBe(value);
      });
    });

    it("respects cache TTL (5 minutes)", () => {
      vi.useFakeTimers();
      const key = "ttl.test";

      setCachedPermission(key, true);
      expect(getCachedPermission(key)).toBe(true);

      // Advance time by 5 minutes + 1 ms
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);

      // Cache should be expired
      expect(getCachedPermission(key)).toBeNull();

      vi.useRealTimers();
    });

    it("keeps fresh cache entries within TTL", () => {
      vi.useFakeTimers();
      const key = "fresh.test";

      setCachedPermission(key, true);
      expect(getCachedPermission(key)).toBe(true);

      // Advance time by 2 minutes (within 5 minute TTL)
      vi.advanceTimersByTime(2 * 60 * 1000);

      // Cache should still be valid
      expect(getCachedPermission(key)).toBe(true);

      vi.useRealTimers();
    });
  });

  describe("clearPermissionCache", () => {
    it("clears all cached permissions", () => {
      setCachedPermission("perm1", true);
      setCachedPermission("perm2", false);
      setCachedPermission("perm3", true);

      expect(getCachedPermission("perm1")).toBe(true);
      expect(getCachedPermission("perm2")).toBe(false);

      clearPermissionCache();

      expect(getCachedPermission("perm1")).toBeNull();
      expect(getCachedPermission("perm2")).toBeNull();
      expect(getCachedPermission("perm3")).toBeNull();
    });

    it("allows new cache entries after clear", () => {
      setCachedPermission("old", true);
      clearPermissionCache();

      setCachedPermission("new", false);
      expect(getCachedPermission("new")).toBe(false);
      expect(getCachedPermission("old")).toBeNull();
    });
  });

  describe("Cache size limit (max 1000 entries)", () => {
    it("removes oldest entry when max size reached", () => {
      // Add 1001 entries (exceeding 1000 limit)
      for (let i = 0; i < 1001; i++) {
        setCachedPermission(`perm${i}`, i % 2 === 0);
      }

      // First entry should be evicted
      expect(getCachedPermission("perm0")).toBeNull();
      // Last entry should still exist (1000 % 2 === 0 is true)
      expect(getCachedPermission("perm1000")).toBe(true);
    });
  });
});
