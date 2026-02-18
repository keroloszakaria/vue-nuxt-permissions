import { getCachedPermission, setCachedPermission } from "@/core/cache";
import { getCurrentPermissions, isDevMode } from "./config";
import { stableStringify, isPermissionObject } from "@/utils/helpers";
import type { PermissionValue, PermissionMode } from "../types";

/**
 * Main Permission Evaluator
 * --------------------------
 * Supports:
 * - "*" (universal access)
 * - string[]
 * - object { permissions, mode }
 * - async caching
 */

const VALID_MODES = new Set<PermissionMode>([
  "and",
  "or",
  "not",
  "startWith",
  "endWith",
  "regex",
]);

const validateRegexPattern = (pattern: string): boolean => {
  try {
    const regex = new RegExp(pattern);
    regex.test("");
    return true;
  } catch {
    return false;
  }
};

/**
 * Synchronous permission evaluation
 * Used internally by directives that need immediate results
 */
export const checkPermissionSync = (
  permissionValue: PermissionValue,
  userPermissions?: string[]
): boolean => {
  const current = userPermissions ?? getCurrentPermissions();

  if (permissionValue === "*") return true;

  if (typeof permissionValue === "string") {
    return current.includes(permissionValue);
  }

  if (Array.isArray(permissionValue)) {
    if (permissionValue.includes("*")) return true;
    return permissionValue.some((v) => current.includes(v));
  }

  if (isPermissionObject(permissionValue)) {
    const { permissions, mode } = permissionValue;

    if (!VALID_MODES.has(mode)) {
      return false;
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return false;
    }

    if (permissions.includes("*")) return true;

    const checks: Record<string, () => boolean> = {
      and: () => permissions.every((p) => current.includes(p)),
      or: () => permissions.some((p) => current.includes(p)),
      not: () => !permissions.some((p) => current.includes(p)),
      startWith: () =>
        permissions.some((p) => current.some((u) => u.startsWith(p))),
      endWith: () =>
        permissions.some((p) => current.some((u) => u.endsWith(p))),
      regex: () =>
        permissions.some((p) => {
          if (!validateRegexPattern(p)) {
            return false;
          }
          try {
            const r = new RegExp(p);
            return current.some((u) => r.test(u));
          } catch {
            return false;
          }
        }),
    };

    return checks[mode]?.() ?? false;
  }

  return false;
};

export const hasPermission = async (
  permissionValue: PermissionValue,
  userPermissions?: string[]
): Promise<boolean> => {
  const current = userPermissions ?? getCurrentPermissions();
  const cacheKey = stableStringify({ permissionValue, current });
  const cached = getCachedPermission(cacheKey);
  if (cached !== null) return cached;

  const log = (...args: any[]) => {
    if (isDevMode()) console.log("[v-permission:core]", ...args);
  };

  const evaluate = async (value: PermissionValue): Promise<boolean> => {
    if (value === "*") return true;

    if (typeof value === "string") return current.includes(value);
    if (Array.isArray(value)) {
      if (value.includes("*")) return true;
      return value.some((v) => current.includes(v));
    }
    if (isPermissionObject(value)) {
      const { permissions, mode } = value;

      if (!VALID_MODES.has(mode)) {
        log(
          `Invalid permission mode: "${mode}". Valid modes:`,
          Array.from(VALID_MODES)
        );
        return false;
      }

      if (!Array.isArray(permissions) || permissions.length === 0) {
        log("Permission array is empty or invalid");
        return false;
      }

      if (permissions.includes("*")) return true;

      const checks: Record<string, () => boolean> = {
        and: () => permissions.every((p) => current.includes(p)),
        or: () => permissions.some((p) => current.includes(p)),
        not: () => !permissions.some((p) => current.includes(p)),
        startWith: () =>
          permissions.some((p) => current.some((u) => u.startsWith(p))),
        endWith: () =>
          permissions.some((p) => current.some((u) => u.endsWith(p))),
        regex: () =>
          permissions.some((p) => {
            if (!validateRegexPattern(p)) {
              log("Invalid or dangerous regex pattern:", p);
              return false;
            }
            try {
              const r = new RegExp(p);
              return current.some((u) => r.test(u));
            } catch (e) {
              log("Regex evaluation error:", p, e);
              return false;
            }
          }),
      };

      return checks[mode]?.() ?? false;
    }

    log("Invalid permission value:", value);
    return false;
  };

  const result = await evaluate(permissionValue);
  setCachedPermission(cacheKey, result);
  return result;
};
