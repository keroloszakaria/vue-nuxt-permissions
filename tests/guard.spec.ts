import { describe, it, expect, vi } from "vitest";
import { globalGuard } from "../src/guards/globalGuard";
import type { RouteLocationNormalized } from "vue-router";

describe("globalGuard", () => {
  it("redirects unauthenticated user", async () => {
    const to: Partial<RouteLocationNormalized> = {
      meta: { requiresAuth: true },
    };
    const next = vi.fn();

    await globalGuard(to as RouteLocationNormalized, {} as any, next, {
      authRoutes: [{ path: "/login" }],
      getAuthState: () => ({ isAuthenticated: false }),
      protectedRoutes: [],
    });

    expect(next).toHaveBeenCalledWith("/login");
  });

  it("allows authenticated users", async () => {
    const to: Partial<RouteLocationNormalized> = {
      meta: { requiresAuth: true },
    };
    const next = vi.fn();

    await globalGuard(to as RouteLocationNormalized, {} as any, next, {
      authRoutes: [{ path: "/login" }],
      getAuthState: () => ({
        isAuthenticated: true,
        permissions: ["dashboard.view"],
      }),
      protectedRoutes: [],
    });

    expect(next).toHaveBeenCalled();
  });
});
