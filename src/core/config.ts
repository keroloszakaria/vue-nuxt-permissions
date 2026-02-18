import { isRef, type Ref, ref } from "vue";
import type { PermissionsArray } from "../types";

export interface GlobalConfig {
  permissions: PermissionsArray | null;
  developmentMode: boolean;
}

const globalConfig: GlobalConfig = {
  permissions: null,
  developmentMode: false,
};

// Global reactive permissions - synchronized with globalConfig
const globalReactivePermissions = ref<string[]>([]);

export const configurePermission = (
  permissions: PermissionsArray,
  options?: { developmentMode?: boolean }
) => {
  globalConfig.permissions = permissions;
  globalConfig.developmentMode = options?.developmentMode ?? false;
  // Also update reactive version for Vue reactivity
  const permsArray = Array.isArray(permissions) ? permissions : [];
  globalReactivePermissions.value = permsArray;
};

export const getReactivePermissions = () => globalReactivePermissions;

export const getCurrentPermissions = (): string[] => {
  const { permissions } = globalConfig;
  if (!permissions) return [];

  if (isRef(permissions)) return permissions.value;
  return permissions;
};

export const isDevMode = () => globalConfig.developmentMode;

export default globalConfig;
