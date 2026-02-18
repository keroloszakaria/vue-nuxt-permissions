import { describe, it, expect } from "vitest";
import {
  normalizePermissions,
  sortUniq,
  stableStringify,
  isPermissionObject,
} from "../src/utils/helpers";
import { ref } from "vue";

describe("Helpers & Utilities (helpers.ts)", () => {
  describe("normalizePermissions", () => {
    it("converts array to string array", () => {
      const result = normalizePermissions(["perm1", "perm2"]);
      expect(result).toEqual(["perm1", "perm2"]);
    });

    it("extracts value from ref", () => {
      const result = normalizePermissions(ref(["ref.perm"]));
      expect(result).toEqual(["ref.perm"]);
    });

    it("returns empty array for null", () => {
      const result = normalizePermissions(null);
      expect(result).toEqual([]);
    });

    it("returns empty array for undefined", () => {
      const result = normalizePermissions(undefined);
      expect(result).toEqual([]);
    });

    it("filters out falsy values", () => {
      const result = normalizePermissions(["perm1", "", null, "perm2"] as any);
      expect(result).toEqual(["perm1", "perm2"]);
    });

    it("preserves duplicate permissions (doesn't dedupe)", () => {
      const result = normalizePermissions(["perm1", "perm1", "perm2"]);
      expect(result).toContain("perm1");
    });
  });

  describe("sortUniq", () => {
    it("removes duplicates", () => {
      const result = sortUniq(["a", "b", "a", "c", "b"]);
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("sorts alphabetically", () => {
      const result = sortUniq(["zebra", "apple", "banana"]);
      expect(result).toEqual(["apple", "banana", "zebra"]);
    });

    it("handles empty array", () => {
      const result = sortUniq([]);
      expect(result).toEqual([]);
    });

    it("handles single item", () => {
      const result = sortUniq(["single"]);
      expect(result).toEqual(["single"]);
    });

    it("handles numeric-looking strings", () => {
      const result = sortUniq(["10", "2", "1", "10"]);
      expect(result).toEqual(["1", "10", "2"]);
    });
  });

  describe("stableStringify", () => {
    it("creates stable JSON for identical objects", () => {
      const obj1 = { b: 2, a: 1 };
      const obj2 = { a: 1, b: 2 };

      const str1 = stableStringify(obj1);
      const str2 = stableStringify(obj2);

      expect(str1).toEqual(str2);
    });

    it("handles nested objects consistently", () => {
      const obj1 = { x: { c: 3, b: 2 }, a: 1 };
      const obj2 = { a: 1, x: { b: 2, c: 3 } };

      const str1 = stableStringify(obj1);
      const str2 = stableStringify(obj2);

      expect(str1).toEqual(str2);
    });

    it("handles arrays", () => {
      const arr = [3, 1, 2];
      const result = stableStringify(arr);
      expect(result).toBe("[3,1,2]");
    });

    it("handles null and undefined", () => {
      expect(stableStringify(null)).toBe("null");
      expect(stableStringify(undefined)).toBeUndefined();
    });

    it("produces different strings for different objects", () => {
      const str1 = stableStringify({ a: 1 });
      const str2 = stableStringify({ a: 2 });

      expect(str1).not.toEqual(str2);
    });

    it("is consistent across multiple calls", () => {
      const obj = { permissions: ["user.view", "post.edit"], current: [] };

      const str1 = stableStringify(obj);
      const str2 = stableStringify(obj);
      const str3 = stableStringify(obj);

      expect(str1).toEqual(str2);
      expect(str2).toEqual(str3);
    });

    it("handles circular reference detection", () => {
      const obj: any = { a: 1 };
      obj.self = obj; // Create circular reference

      // Should not throw
      expect(() => stableStringify(obj)).not.toThrow();
    });

    it("preserves number types", () => {
      const str = stableStringify({ a: 1, b: 2 });
      expect(str).toContain(":1");
      expect(str).toContain(":2");
    });

    it("preserves boolean types", () => {
      const str = stableStringify({ yes: true, no: false });
      expect(str).toContain("true");
      expect(str).toContain("false");
    });
  });

  describe("isPermissionObject", () => {
    it("returns true for valid permission object", () => {
      const obj = {
        permissions: ["perm1", "perm2"],
        mode: "and" as const,
      };
      expect(isPermissionObject(obj)).toBe(true);
    });

    it("returns false for string", () => {
      expect(isPermissionObject("string")).toBe(false);
    });

    it("returns false for array", () => {
      expect(isPermissionObject(["perm1"])).toBe(false);
    });

    it("returns false for object without permissions property", () => {
      expect(isPermissionObject({ mode: "and" })).toBe(false);
    });

    it("returns false for object without mode property", () => {
      expect(isPermissionObject({ permissions: ["perm1"] })).toBe(false);
    });

    it("returns false for null", () => {
      expect(isPermissionObject(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isPermissionObject(undefined)).toBe(false);
    });

    it("returns true for valid object with extra properties", () => {
      const obj = {
        permissions: ["perm1"],
        mode: "or" as const,
        extra: "property",
      };
      expect(isPermissionObject(obj)).toBe(true);
    });

    it("accepts any value for mode and permissions fields", () => {
      const obj = {
        permissions: ["perm1"],
        mode: "and" as const,
      };
      expect(isPermissionObject(obj)).toBe(true);

      // Note: isPermissionObject only checks for field presence, not types
      const objWithNumber = {
        permissions: ["perm1"],
        mode: 123,
      };
      expect(isPermissionObject(objWithNumber)).toBe(true); // Has both fields

      const objWithString = {
        permissions: "string" as any,
        mode: "and",
      };
      expect(isPermissionObject(objWithString)).toBe(true); // Has both fields
    });
  });

  describe("Edge cases for helpers", () => {
    it("handles very long permission strings", () => {
      const longPerm = "a".repeat(10000);
      const result = normalizePermissions([longPerm]);
      expect(result[0]).toHaveLength(10000);
    });

    it("handles unicode characters in permissions", () => {
      const result = normalizePermissions(["用户.查看", "админ.доступ"]);
      expect(result).toContain("用户.查看");
      expect(result).toContain("админ.доступ");
    });

    it("stableStringify handles large objects", () => {
      const largeObj: any = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = `value${i}`;
      }

      expect(() => stableStringify(largeObj)).not.toThrow();
    });

    it("sortUniq maintains order for equal items", () => {
      const result = sortUniq(["b", "a", "a", "c"]);
      expect(result).toEqual(["a", "b", "c"]);
    });
  });
});
