import type { PermissionMode, PermissionsArray } from "@/types";
import { isRef } from "vue";

export const normalizePermissions = (
  p: PermissionsArray | null | undefined,
): string[] => {
  if (!p) return [];
  const v = isRef(p) ? p.value : p;
  return Array.isArray(v) ? v.filter(Boolean) : [];
};

export const sortUniq = (arr: string[]) => Array.from(new Set(arr)).sort();

/* Stable stringify for cache keys */
export const stableStringify = (value: any): string => {
  const seen = new WeakSet();

  return JSON.stringify(value, (_k, v) => {
    if (v && typeof v === "object") {
      if (seen.has(v)) return;
      seen.add(v);

      if (Array.isArray(v)) return v;

      return Object.keys(v)
        .sort()
        .reduce((acc: any, key) => {
          acc[key] = v[key];
          return acc;
        }, {});
    }
    return v;
  });
};

export const isPermissionObject = (
  v: unknown,
): v is { permissions: string[]; mode: PermissionMode } =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  "permissions" in v &&
  "mode" in v;
