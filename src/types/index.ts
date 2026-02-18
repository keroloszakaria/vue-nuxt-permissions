import type { Ref } from "vue";
import type { RouteLocationNormalized } from "vue-router";

/* -------------------------------------------------
 * Permission Modes
 * ------------------------------------------------- */
export type PermissionMode =
  | "and"
  | "or"
  | "not"
  | "startWith"
  | "endWith"
  | "regex";

/* -------------------------------------------------
 * Permission Value
 * ------------------------------------------------- */
export interface PermissionObject {
  permissions: string[];
  mode: PermissionMode;
}

export type PermissionValue =
  | "*"
  | string
  | string[]
  | PermissionObject;

export type PermissionsArray = string[] | Ref<string[]>;

/* -------------------------------------------------
 * Global Config
 * ------------------------------------------------- */
export interface GlobalConfig {
  permissions: PermissionsArray | null;
  developmentMode: boolean;
}

/* -------------------------------------------------
 * Plugin Options
 * ------------------------------------------------- */
export interface PluginOptions {
  permissions?: PermissionsArray;
  developmentMode?: boolean;
  fetchPermissions?: () => Promise<string[]>;
  persist?: boolean;
}

/* -------------------------------------------------
 * Route Meta with Permissions
 * ------------------------------------------------- */
export interface RouteMetaWithPermissions {
  requiresAuth?: boolean;
  checkPermission?: boolean;
  permissions?: PermissionValue;
  isAuthRoute?: boolean;
  [key: string]: any;
}

/* -------------------------------------------------
 * Permission Route
 * ------------------------------------------------- */
export interface PermissionRoute {
  path: string;
  meta?: RouteMetaWithPermissions;
  children?: PermissionRoute[];
  [key: string]: any;
}

/* -------------------------------------------------
 * Guard Options
 * ------------------------------------------------- */
export interface GuardOptions {
  authRoutes?: Array<{ path: string }>;
  protectedRoutes?: PermissionRoute[];
  getAuthState?: () => AuthState;
  loginPath?: string;
  homePath?: string;
  onDenied?: (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ) => void;
  onAllowed?: (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ) => void;
}

/* -------------------------------------------------
 * Auth State
 * ------------------------------------------------- */
export interface AuthState {
  isAuthenticated: boolean;
  permissions?: string[];
  user?: {
    permissions?: string[];
    [key: string]: any;
  };
}

/* -------------------------------------------------
 * HTMLElement Augmentation
 * ------------------------------------------------- */
declare global {
  interface HTMLElement {
    _vPermissionOriginalDisplay?: string;
    _vPermissionSkipUpdates?: boolean;
    _vPermissionParent?: Node | null;
    _vPermissionNextSibling?: Node | null;
    _vPermissionComment?: Comment | null;
  }
}

/* -------------------------------------------------
 * Vue Router Meta
 * ------------------------------------------------- */
declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    checkPermission?: boolean;
    permissions?: PermissionValue;
    isAuthRoute?: boolean;
  }
}
