import { clearPermissionCache } from "@/core/cache";
import { getCurrentPermissions } from "@/core/config";
import { hasPermission } from "@/core/evaluator";
import type { PermissionValue } from "@/types";
import {
  getPermissionsFromStorage,
  savePermissionsToStorage,
} from "@/utils/storage";
import { computed, ref } from "vue";

/**
 * usePermission Composable
 * Reactive + Async + Cached Permission Checker
 */
export function usePermission() {
  // Priority: global config -> storage -> empty array
  // Note: getCurrentPermissions() returns [] when not configured, so check length
  const globalPerms = getCurrentPermissions();
  let initialPerms: string[] = [];
  let sourceType: "global" | "storage" | "empty" = "empty";

  if (globalPerms && globalPerms.length > 0) {
    initialPerms = globalPerms;
    sourceType = "global";
  } else {
    const storedPerms = getPermissionsFromStorage();
    if (storedPerms && storedPerms.length > 0) {
      initialPerms = storedPerms;
      sourceType = "storage";
    }
  }

  const permissions = ref<string[]>(initialPerms);

  /**
   * can(rule)
   * Async permission evaluator
   */
  const can = async (rule: PermissionValue) => {
    return await hasPermission(rule, permissions.value);
  };

  /**
   * canSync(rule)
   * Instant local check — simplified fallback
   */
  const canSync = (rule: PermissionValue) => {
    if (rule === "*") return true;
    if (typeof rule === "string") return permissions.value.includes(rule);
    if (Array.isArray(rule)) {
      if (rule.includes("*")) return true;
      return rule.some((r) => permissions.value.includes(r));
    }
    if (typeof rule === "object" && rule.permissions && rule.mode) {
      const { permissions: p, mode } = rule;
      if (!Array.isArray(p) || p.length === 0) return false;
      if (p.includes("*")) return true;
      if (mode === "and") return p.every((v) => permissions.value.includes(v));
      if (mode === "or") return p.some((v) => permissions.value.includes(v));
      if (mode === "not") return !p.some((v) => permissions.value.includes(v));
      if (mode === "startWith")
        return p.some((pat) =>
          permissions.value.some((u) => u.startsWith(pat)),
        );
      if (mode === "endWith")
        return p.some((pat) => permissions.value.some((u) => u.endsWith(pat)));
      if (mode === "regex")
        return p.some((pat) => {
          try {
            const r = new RegExp(pat);
            return permissions.value.some((u) => r.test(u));
          } catch {
            return false;
          }
        });
    }
    return false;
  };

  /**
   * refresh()
   * Clear cache and reload from the same source used during initialization
   */
  const refresh = () => {
    clearPermissionCache();
    if (sourceType === "global") {
      // Reload from current global config (may have been updated)
      const currentGlobalPerms = getCurrentPermissions();
      permissions.value =
        currentGlobalPerms && currentGlobalPerms.length > 0
          ? currentGlobalPerms
          : [];
    } else if (sourceType === "storage") {
      // Reload from current storage
      const storedPerms = getPermissionsFromStorage();
      permissions.value =
        storedPerms && storedPerms.length > 0 ? storedPerms : [];
    } else {
      // Source was empty, reset to empty
      permissions.value = [];
    }
  };

  /**
   * setPermissions()
   */
  const setPermissions = (newPerms: string[]) => {
    if (!Array.isArray(newPerms)) {
      console.error("[v-permission] Permissions must be an array");
      return;
    }
    clearPermissionCache();
    permissions.value = newPerms;
    savePermissionsToStorage(newPerms);
  };

  /**
   * hasAll()
   */
  const hasAll = async (perms: string[]) => {
    // Empty array means no requirements, so always true
    if (!Array.isArray(perms) || perms.length === 0) return true;
    return await can({ permissions: perms, mode: "and" });
  };

  /**
   * hasAny()
   */
  const hasAny = async (perms: string[]) => {
    // Empty array or non-array should return false
    if (!Array.isArray(perms) || perms.length === 0) return false;
    return await can({ permissions: perms, mode: "or" });
  };

  return {
    permissions: computed(() => permissions.value),
    can,
    hasPermission: can, // Alias for can() — used in docs & templates
    canSync,
    refresh,
    setPermissions,
    hasAll,
    hasAny,
  };
}
