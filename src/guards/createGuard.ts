import type {
  Router,
  RouteLocationNormalized,
  NavigationGuardNext,
} from "vue-router";
import { hasPermission } from "@/core/evaluator";
import { getCurrentPermissions } from "@/core/config";
import type { GuardOptions, PermissionRoute } from "@/types";

const MAX_ROUTE_DEPTH = 50;

/**
 * createPermissionGuard
 * ---------------------
 * Generates a dynamic permission guard for any Vue or Nuxt router.
 *
 * Example:
 * router.beforeEach(createPermissionGuard({
 *   loginPath: '/login',
 *   homePath: '/',
 *   onDenied: (to) => console.warn('Denied:', to.path)
 * }))
 */
export const createPermissionGuard = (options: GuardOptions = {}) => {
  const {
    authRoutes = [],
    protectedRoutes = [] as PermissionRoute[],
    getAuthState,
    loginPath = "/login",
    homePath = "/",
    onDenied,
    onAllowed,
  } = options;

  return async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) => {
    try {
      const authState = getAuthState?.() ?? { isAuthenticated: false };
      const isAuthenticated = authState.isAuthenticated;
      const userPermissions = authState.permissions ?? getCurrentPermissions();

      const isAuthRoute = authRoutes.some((r) => r.path === to.path);
      const requiresAuth = to.meta?.requiresAuth ?? false;
      const checkPermission = to.meta?.checkPermission ?? false;

      if (!isAuthenticated && requiresAuth) {
        onDenied?.(to, from);
        return next(loginPath);
      }

      if (isAuthenticated && isAuthRoute) {
        onAllowed?.(to, from);
        return next(homePath);
      }

      if (checkPermission && to.meta?.permissions) {
        const allowed = await hasPermission(
          to.meta.permissions,
          userPermissions
        );
        if (!allowed) {
          onDenied?.(to, from);

          const fallback = await findAccessibleRoute(
            protectedRoutes,
            userPermissions
          );
          return next(fallback || loginPath);
        }
      }

      onAllowed?.(to, from);
      next();
    } catch (e) {
      console.error("[v-permission:guard] Unexpected error:", e);
      next(loginPath);
    }
  };
};

/**
 * Recursively finds a route that the user has permission to access.
 * Includes depth protection against circular/deeply nested routes.
 */
async function findAccessibleRoute(
  routes: PermissionRoute[],
  userPermissions: string[],
  basePath = "",
  depth = 0
): Promise<string | null> {
  if (depth > MAX_ROUTE_DEPTH) {
    console.warn("[v-permission:guard] Route nesting exceeds max depth");
    return null;
  }

  for (const route of routes) {
    const fullPath = basePath + route.path;
    const requiredPermissions = route.meta?.permissions ?? "*";

    if (await hasPermission(requiredPermissions, userPermissions)) {
      return fullPath;
    }

    if (route.children?.length) {
      const child = await findAccessibleRoute(
        route.children,
        userPermissions,
        fullPath,
        depth + 1
      );
      if (child) return child;
    }
  }
  return null;
}
