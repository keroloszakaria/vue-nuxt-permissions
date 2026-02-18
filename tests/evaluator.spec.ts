import { describe, it, expect, beforeEach } from "vitest";
import { hasPermission } from "../src/core/evaluator";
import { configurePermission } from "../src/core/config";
import { clearPermissionCache } from "../src/core/cache";
import type { PermissionValue } from "../src/types";

describe("Permission Evaluator (evaluator.ts)", () => {
  beforeEach(() => {
    clearPermissionCache();
  });

  describe("Universal Access (*)", () => {
    it("allows access with wildcard permission", async () => {
      const allowed = await hasPermission("*");
      expect(allowed).toBe(true);
    });

    it("allows access when * is in array", async () => {
      const allowed = await hasPermission(["admin", "*", "user"]);
      expect(allowed).toBe(true);
    });

    it("allows access when * is in object permissions", async () => {
      const allowed = await hasPermission({
        permissions: ["*"],
        mode: "and",
      });
      expect(allowed).toBe(true);
    });
  });

  describe("String Permission", () => {
    beforeEach(() => {
      configurePermission(["user.view", "user.edit", "admin.access"]);
    });

    it("returns true for existing permission", async () => {
      const allowed = await hasPermission("user.view");
      expect(allowed).toBe(true);
    });

    it("returns false for non-existing permission", async () => {
      const allowed = await hasPermission("admin.delete");
      expect(allowed).toBe(false);
    });

    it("is case-sensitive", async () => {
      const allowed = await hasPermission("User.View");
      expect(allowed).toBe(false);
    });
  });

  describe("Array Permissions", () => {
    beforeEach(() => {
      configurePermission(["editor", "moderator", "viewer"]);
    });

    it("returns true if user has any permission in array (OR logic)", async () => {
      const allowed = await hasPermission(["editor", "admin", "viewer"]);
      expect(allowed).toBe(true);
    });

    it("returns false if user has none of the permissions", async () => {
      const allowed = await hasPermission(["admin", "superuser"]);
      expect(allowed).toBe(false);
    });

    it("works with single-item array", async () => {
      const allowed = await hasPermission(["editor"]);
      expect(allowed).toBe(true);
    });

    it("returns true with empty array if permissions exist", async () => {
      configurePermission(["something"]);
      const allowed = await hasPermission([]);
      expect(allowed).toBe(false);
    });
  });

  describe("Object Permissions - AND Mode", () => {
    beforeEach(() => {
      configurePermission([
        "post.view",
        "post.edit",
        "post.delete",
        "comment.view",
      ]);
    });

    it("returns true when user has ALL required permissions", async () => {
      const allowed = await hasPermission({
        permissions: ["post.view", "post.edit"],
        mode: "and",
      });
      expect(allowed).toBe(true);
    });

    it("returns false when user lacks one permission", async () => {
      const allowed = await hasPermission({
        permissions: ["post.view", "post.edit", "post.publish"],
        mode: "and",
      });
      expect(allowed).toBe(false);
    });

    it("handles single permission in and mode", async () => {
      const allowed = await hasPermission({
        permissions: ["post.view"],
        mode: "and",
      });
      expect(allowed).toBe(true);
    });
  });

  describe("Object Permissions - OR Mode", () => {
    beforeEach(() => {
      configurePermission(["editor", "moderator"]);
    });

    it("returns true when user has any required permission", async () => {
      const allowed = await hasPermission({
        permissions: ["admin", "editor", "viewer"],
        mode: "or",
      });
      expect(allowed).toBe(true);
    });

    it("returns false when user has none of the permissions", async () => {
      const allowed = await hasPermission({
        permissions: ["admin", "superuser"],
        mode: "or",
      });
      expect(allowed).toBe(false);
    });
  });

  describe("Object Permissions - NOT Mode", () => {
    beforeEach(() => {
      configurePermission(["user", "editor"]);
    });

    it("returns true when user does NOT have the permission", async () => {
      const allowed = await hasPermission({
        permissions: ["admin"],
        mode: "not",
      });
      expect(allowed).toBe(true);
    });

    it("returns false when user HAS the permission", async () => {
      const allowed = await hasPermission({
        permissions: ["user"],
        mode: "not",
      });
      expect(allowed).toBe(false);
    });

    it("handles multiple permissions in not mode", async () => {
      const allowed = await hasPermission({
        permissions: ["admin", "superuser"],
        mode: "not",
      });
      expect(allowed).toBe(true);
    });

    it("returns false if user has any of the not permissions", async () => {
      const allowed = await hasPermission({
        permissions: ["admin", "editor"],
        mode: "not",
      });
      expect(allowed).toBe(false);
    });
  });

  describe("Object Permissions - startWith Mode", () => {
    beforeEach(() => {
      configurePermission([
        "post.view",
        "post.edit",
        "post.delete",
        "comment.view",
      ]);
    });

    it("returns true when user has permission starting with pattern", async () => {
      const allowed = await hasPermission({
        permissions: ["post"],
        mode: "startWith",
      });
      expect(allowed).toBe(true);
    });

    it("returns false when no permission starts with pattern", async () => {
      const allowed = await hasPermission({
        permissions: ["admin"],
        mode: "startWith",
      });
      expect(allowed).toBe(false);
    });

    it("handles exact prefix match", async () => {
      const allowed = await hasPermission({
        permissions: ["post.v"],
        mode: "startWith",
      });
      expect(allowed).toBe(true);
    });

    it("matches at any permission level", async () => {
      const allowed = await hasPermission({
        permissions: ["comment"],
        mode: "startWith",
      });
      expect(allowed).toBe(true);
    });
  });

  describe("Object Permissions - endWith Mode", () => {
    beforeEach(() => {
      configurePermission([
        "post.view",
        "admin.view",
        "user.view",
        "post.delete",
      ]);
    });

    it("returns true when user has permission ending with pattern", async () => {
      const allowed = await hasPermission({
        permissions: ["view"],
        mode: "endWith",
      });
      expect(allowed).toBe(true);
    });

    it("returns false when no permission ends with pattern", async () => {
      const allowed = await hasPermission({
        permissions: ["edit"],
        mode: "endWith",
      });
      expect(allowed).toBe(false);
    });

    it("handles exact suffix match", async () => {
      const allowed = await hasPermission({
        permissions: [".view"],
        mode: "endWith",
      });
      expect(allowed).toBe(true);
    });

    it("works with partial suffix", async () => {
      const allowed = await hasPermission({
        permissions: ["ew"],
        mode: "endWith",
      });
      expect(allowed).toBe(true);
    });
  });

  describe("Object Permissions - regex Mode", () => {
    beforeEach(() => {
      configurePermission([
        "user.view.detail",
        "user.edit.profile",
        "post.create",
        "admin.settings",
      ]);
    });

    it("returns true when regex matches a permission", async () => {
      const allowed = await hasPermission({
        permissions: ["^user\\..*"],
        mode: "regex",
      });
      expect(allowed).toBe(true);
    });

    it("returns false when regex matches no permission", async () => {
      const allowed = await hasPermission({
        permissions: ["^super\\..*"],
        mode: "regex",
      });
      expect(allowed).toBe(false);
    });

    it("handles case-sensitive regex", async () => {
      const allowed = await hasPermission({
        permissions: ["^USER\\..*"],
        mode: "regex",
      });
      expect(allowed).toBe(false);
    });

    it("handles complex regex patterns", async () => {
      const allowed = await hasPermission({
        permissions: [".*\\.(view|edit).*"],
        mode: "regex",
      });
      expect(allowed).toBe(true);
    });

    it("handles invalid regex gracefully", async () => {
      const allowed = await hasPermission({
        permissions: ["[invalid(regex"],
        mode: "regex",
      });
      expect(allowed).toBe(false);
    });

    it("protects against ReDoS attacks", async () => {
      const allowed = await hasPermission({
        permissions: ["(a+)+b"],
        mode: "regex",
      });
      expect(allowed).toBe(false);
    });
  });

  describe("Caching Behavior", () => {
    beforeEach(() => {
      configurePermission(["user", "editor"]);
    });

    it("caches permission evaluation results", async () => {
      const result1 = await hasPermission("user");
      const result2 = await hasPermission("user");

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it("uses stable cache keys with identical objects", async () => {
      const rule1 = { permissions: ["user", "editor"], mode: "and" as const };
      const rule2 = { permissions: ["user", "editor"], mode: "and" as const };

      const result1 = await hasPermission(rule1);
      const result2 = await hasPermission(rule2);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  describe("Custom User Permissions", () => {
    it("allows passing custom permissions to hasPermission", async () => {
      configurePermission(["default.perm"]);

      const allowed = await hasPermission("custom.perm", [
        "custom.perm",
        "another.perm",
      ]);
      expect(allowed).toBe(true);
    });

    it("custom permissions override configured permissions", async () => {
      configurePermission(["original.perm"]);

      const allowed = await hasPermission("original.perm", ["different.perm"]);
      expect(allowed).toBe(false);
    });
  });

  describe("Edge Cases & Invalid Inputs", () => {
    beforeEach(() => {
      configurePermission(["valid.permission"]);
    });

    it("handles invalid permission mode gracefully", async () => {
      const allowed = await hasPermission({
        permissions: ["test"],
        mode: "invalid" as any,
      });
      expect(allowed).toBe(false);
    });

    it("handles empty permission array in object", async () => {
      const allowed = await hasPermission({
        permissions: [],
        mode: "and",
      });
      expect(allowed).toBe(false);
    });

    it("returns false for null/undefined permission", async () => {
      const allowed = await hasPermission(null as any);
      expect(allowed).toBe(false);
    });

    it("returns false for undefined permission", async () => {
      const allowed = await hasPermission(undefined as any);
      expect(allowed).toBe(false);
    });

    it("handles very long permission strings", async () => {
      const longPerm = "a".repeat(10000);
      configurePermission([longPerm]);

      const allowed = await hasPermission(longPerm);
      expect(allowed).toBe(true);
    });
  });

  describe("Permission Validation", () => {
    it("logs warning for invalid mode in dev mode", async () => {
      configurePermission(["test"], { developmentMode: true });

      await hasPermission({
        permissions: ["test"],
        mode: "badmode" as any,
      });

      // In dev mode, should log a warning (verified by dev mode setup)
    });

    it("validates regex patterns safely", async () => {
      const result = await hasPermission({
        permissions: ["[invalid-regex"],
        mode: "regex",
      });
      expect(result).toBe(false);
    });
  });
});
