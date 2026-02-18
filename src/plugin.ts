import type { App } from "vue";
import type { PluginOptions } from "@/types";
import { vPermission } from "@/directives/v-permission";
import {
  configurePermission,
  clearPermissionCache,
  getReactivePermissions,
} from "@/core";
import {
  getPermissionsFromStorage,
  savePermissionsToStorage,
} from "@/utils/storage";
import { normalizePermissions } from "@/utils/helpers";

export default {
  async install(app: App, options?: PluginOptions) {
    let permissions: string[] = [];

    if (options?.fetchPermissions) {
      try {
        permissions = await options.fetchPermissions();
      } catch (e) {
        console.error("[v-permission] Failed to fetch permissions:", e);
        permissions = getPermissionsFromStorage() ?? [];
      }
    } else if (options?.permissions) {
      permissions = normalizePermissions(options.permissions);
    } else {
      permissions = getPermissionsFromStorage() ?? [];
    }

    clearPermissionCache();
    configurePermission(permissions, {
      developmentMode: options?.developmentMode,
    });

    if (options?.persist !== false) {
      savePermissionsToStorage(permissions);
    }

    // Provide reactive permissions to components and directives
    const reactivePermissions = getReactivePermissions();
    app.provide("__v_permission_reactive__", reactivePermissions);

    app.directive("permission", vPermission);
  },
};
