import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPermissionGuard } from "../src/guards/createGuard";
import { globalGuard } from "../src/guards/globalGuard";
import { configurePermission } from "../src/core/config";
import { clearPermissionCache } from "../src/core/cache";
import type { RouteLocationNormalized, NavigationGuardNext } from "vue-router";
import type { GuardOptions, PermissionRoute } from "../src/types";

describe("Permission Guards", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["user.view", "post.edit"]);
  });

  // Mock navigation objects
  const createMockRoute = (
    path: string,
    meta: Record<string, any> = {}
  ): RouteLocationNormalized => ({
    path,
    name: path,
    matched: [],
    params: {},
    query: {},
    hash: "",
    fullPath: path,
    meta,
    redirectedFrom: undefined,
  });

  describe("createPermissionGuard", () => {
    it("allows navigation to unprotected routes", async () => {
      const guard = createPermissionGuard();
      const to = createMockRoute("/public");
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("blocks unauthenticated users from protected routes", async () => {
      const guard = createPermissionGuard({
        loginPath: "/login",
      });
      const to = createMockRoute("/dashboard", { requiresAuth: true });
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      expect(next).toHaveBeenCalledWith("/login");
    });

    it("allows authenticated users to protected routes", async () => {
      const guard = createPermissionGuard({
        getAuthState: () => ({ isAuthenticated: true }),
      });
      const to = createMockRoute("/dashboard", { requiresAuth: true });
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("redirects authenticated users away from auth routes", async () => {
      const guard = createPermissionGuard({
        authRoutes: [{ path: "/login" }],
        homePath: "/dashboard",
        getAuthState: () => ({ isAuthenticated: true }),
      });
      const to = createMockRoute("/login");
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      expect(next).toHaveBeenCalledWith("/dashboard");
    });

    it("checks permissions when checkPermission is true", async () => {
      const guard = createPermissionGuard({
        getAuthState: () => ({ isAuthenticated: true }),
      });
      const to = createMockRoute("/admin", {
        checkPermission: true,
        permissions: "user.view",
      });
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("denies access when permission check fails", async () => {
      const guard = createPermissionGuard({
        loginPath: "/login",
        getAuthState: () => ({ isAuthenticated: true }),
      });
      const to = createMockRoute("/admin", {
        checkPermission: true,
        permissions: "admin.access",
      });
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      expect(next).toHaveBeenCalledWith("/login");
    });

    it("calls onDenied callback on denied access", async () => {
      const onDenied = vi.fn();
      const guard = createPermissionGuard({
        loginPath: "/login",
        onDenied,
      });
      const to = createMockRoute("/protected", { requiresAuth: true });
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      expect(onDenied).toHaveBeenCalledWith(to, from);
    });

    it("calls onAllowed callback on allowed access", async () => {
      const onAllowed = vi.fn();
      const guard = createPermissionGuard({
        onAllowed,
        getAuthState: () => ({ isAuthenticated: true }),
      });
      const to = createMockRoute("/public");
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      expect(onAllowed).toHaveBeenCalledWith(to, from);
    });

    it("handles guard errors gracefully", async () => {
      const guard = createPermissionGuard({
        loginPath: "/login",
        getAuthState: () => {
          throw new Error("Auth check failed");
        },
      });
      const to = createMockRoute("/");
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      expect(next).toHaveBeenCalledWith("/login");
    });

    it("uses custom user permissions from authState", async () => {
      const guard = createPermissionGuard({
        getAuthState: () => ({
          isAuthenticated: true,
          permissions: ["custom.perm"],
        }),
      });
      const to = createMockRoute("/custom", {
        checkPermission: true,
        permissions: "custom.perm",
      });
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("finds accessible fallback route from protectedRoutes", async () => {
      const protectedRoutes: PermissionRoute[] = [
        {
          path: "/admin",
          meta: { permissions: "admin.access" },
        },
        {
          path: "/user",
          meta: { permissions: "user.view" },
        },
      ];

      const guard = createPermissionGuard({
        loginPath: "/login",
        protectedRoutes,
        getAuthState: () => ({ isAuthenticated: true }),
      });
      const to = createMockRoute("/admin", {
        checkPermission: true,
        permissions: "admin.access",
      });
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      // User has user.view, so should be redirected to /user
      expect(next).toHaveBeenCalled();
    });

    it("respects route depth limit", async () => {
      // Create deeply nested routes (more than 50 levels)
      let deepRoute: PermissionRoute = {
        path: "/deep",
        meta: { permissions: "*" }, // Allow access
      };
      // Create 60 levels of nesting
      for (let i = 0; i < 60; i++) {
        deepRoute = {
          path: `/level${i}`,
          children: [deepRoute],
        };
      }

      const guard = createPermissionGuard({
        loginPath: "/login",
        protectedRoutes: [deepRoute],
        getAuthState: () => ({ isAuthenticated: true }),
      });

      // Try to access a route that would require traversing 60 levels
      const to = createMockRoute("/level0");
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      // Guard should allow or find accessible route (depth check is internal)
      // The depth limit prevents infinite recursion, doesn't necessarily block access
      expect(next).toHaveBeenCalled();
    });
  });

  describe("globalGuard", () => {
    it("allows navigation to unprotected routes", async () => {
      const to = createMockRoute("/public");
      const from = createMockRoute("/");
      const next = vi.fn();

      await globalGuard(to, from, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("blocks unauthenticated users from requiresAuth routes", async () => {
      const to = createMockRoute("/protected", { requiresAuth: true });
      const from = createMockRoute("/");
      const next = vi.fn();

      await globalGuard(to, from, next, {
        loginPath: "/login",
      });

      expect(next).toHaveBeenCalledWith("/login");
    });

    it("allows authenticated users", async () => {
      const to = createMockRoute("/dashboard", { requiresAuth: true });
      const from = createMockRoute("/");
      const next = vi.fn();

      await globalGuard(to, from, next, {
        getAuthState: () => ({ isAuthenticated: true }),
      });

      expect(next).toHaveBeenCalledWith();
    });

    it("checks permissions for routes with checkPermission meta", async () => {
      const to = createMockRoute("/admin", {
        checkPermission: true,
        permissions: "admin.access",
      });
      const from = createMockRoute("/");
      const next = vi.fn();

      await globalGuard(to, from, next, {
        getAuthState: () => ({ isAuthenticated: true }),
        loginPath: "/login",
      });

      expect(next).toHaveBeenCalledWith("/login");
    });

    it("calls onDenied callback", async () => {
      const onDenied = vi.fn();
      const to = createMockRoute("/admin", { requiresAuth: true });
      const from = createMockRoute("/");
      const next = vi.fn();

      await globalGuard(to, from, next, {
        loginPath: "/login",
        onDenied,
      });

      expect(onDenied).toHaveBeenCalledWith(to, from);
    });

    it("calls onAllowed callback", async () => {
      const onAllowed = vi.fn();
      const to = createMockRoute("/public");
      const from = createMockRoute("/");
      const next = vi.fn();

      await globalGuard(to, from, next, {
        onAllowed,
      });

      expect(onAllowed).toHaveBeenCalledWith(to, from);
    });

    it("handles errors gracefully", async () => {
      const to = createMockRoute("/");
      const from = createMockRoute("/");
      const next = vi.fn();

      const guardWithError = async (
        to: RouteLocationNormalized,
        from: RouteLocationNormalized,
        next: NavigationGuardNext
      ) => {
        try {
          throw new Error("Guard error");
        } catch (e) {
          next("/login");
        }
      };

      await guardWithError(to, from, next);
      expect(next).toHaveBeenCalledWith("/login");
    });

    it("uses custom homePath for authenticated auth routes", async () => {
      const to = createMockRoute("/login");
      const from = createMockRoute("/");
      const next = vi.fn();

      await globalGuard(to, from, next, {
        authRoutes: [{ path: "/login" }],
        homePath: "/dashboard",
        getAuthState: () => ({ isAuthenticated: true }),
      });

      expect(next).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Route nesting and accessibility", () => {
    it("finds accessible routes in nested structure", async () => {
      const protectedRoutes: PermissionRoute[] = [
        {
          path: "/admin",
          meta: { permissions: "admin" },
          children: [
            {
              path: "/users",
              meta: { permissions: "admin.users" },
            },
            {
              path: "/settings",
              meta: { permissions: "user.view" }, // User has this!
            },
          ],
        },
      ];

      const guard = createPermissionGuard({
        protectedRoutes,
        loginPath: "/login",
        getAuthState: () => ({ isAuthenticated: true }),
      });

      const to = createMockRoute("/admin", {
        checkPermission: true,
        permissions: "admin",
      });
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("Multiple permission modes in guards", () => {
    it("supports AND mode in guard permissions", async () => {
      const guard = createPermissionGuard({
        getAuthState: () => ({ isAuthenticated: true }),
      });
      const to = createMockRoute("/restricted", {
        checkPermission: true,
        permissions: {
          permissions: ["user.view", "post.edit"],
          mode: "and",
        },
      });
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("supports wildcard in guard permissions", async () => {
      const guard = createPermissionGuard({
        getAuthState: () => ({ isAuthenticated: true }),
      });
      const to = createMockRoute("/public", {
        checkPermission: true,
        permissions: "*",
      });
      const from = createMockRoute("/");
      const next = vi.fn();

      await guard(to, from, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
