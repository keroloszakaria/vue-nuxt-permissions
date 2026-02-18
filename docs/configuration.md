# Configuration

Configure vue-nuxt-permission to match your application's permission model and architecture.

## Global Configuration

The plugin accepts configuration during installation in both Vue 3 and Nuxt 3 environments. Configuration determines how permissions are initialized, persisted, and managed globally.

### Nuxt 3

Add the module configuration to your `nuxt.config.ts`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    permissions: ["user.view", "user.create", "user.edit", "user.delete"],
    developmentMode: process.env.NODE_ENV === "development",
    persist: true,
  },
});
```

### Vue 3

Install the plugin in your application entry point:

```ts
// main.ts
import { createApp } from "vue";
import { PermissionPlugin } from "vue-nuxt-permission";
import App from "./App.vue";

const app = createApp(App);

app.use(PermissionPlugin, {
  permissions: ["user.view", "user.create", "user.edit", "user.delete"],
  developmentMode: process.env.NODE_ENV === "development",
  persist: true,
});

app.mount("#app");
```

## Configuration Options

### `permissions`

The initial set of user permissions. Can be a static array or a reactive Vue Ref.

**Type**: `string[] | Ref<string[]> | (() => Promise<string[]>)`

**Default**: `[]`

**Examples**:

```ts
// Static array
permissions: ["admin", "moderator"];

// Reactive Ref (updates reactively across app)
import { ref } from "vue";
const userPerms = ref(["user.view"]);
app.use(PermissionPlugin, { permissions: userPerms });

// Async function (use fetchPermissions instead)
```

### `developmentMode`

Enable detailed logging for debugging permission evaluations. Logs are only output when this flag is true.

**Type**: `boolean`

**Default**: `false`

**Example**:

```ts
// Enable in development
app.use(PermissionPlugin, {
  permissions: ["admin"],
  developmentMode: process.env.NODE_ENV === "development",
});
```

When enabled, console logs like the following appear:

```
[v-permission:core] Evaluated permission "admin": ALLOWED
[v-permission:core] Removing element from DOM
```

### `fetchPermissions`

Asynchronously fetch permissions from an API or authentication service. Takes priority over the static `permissions` option.

**Type**: `() => Promise<string[]>`

**Default**: `undefined`

**Example**:

```ts
app.use(PermissionPlugin, {
  fetchPermissions: async () => {
    const response = await fetch("/api/user/permissions");
    const data = await response.json();
    return data.permissions; // ["user.view", "user.edit", ...]
  },
});
```

If the fetch fails, the plugin falls back to stored permissions in localStorage, then to an empty array.

### `persist`

Whether to save permissions to localStorage automatically. Persisted permissions are Base64-encoded for basic obfuscation.

**Type**: `boolean`

**Default**: `true`

**Example**:

```ts
// Disable persistence (permissions lost on page reload)
app.use(PermissionPlugin, {
  permissions: ["user.view"],
  persist: false,
});

// Enable persistence (default)
app.use(PermissionPlugin, {
  permissions: ["user.view"],
  persist: true,
});
```

## Permission Definition Strategies

### Strategy 1: Hierarchical Permissions

Organize permissions by resource and action:

```ts
const permissions = [
  "users.view",
  "users.create",
  "users.edit",
  "users.delete",
  "posts.view",
  "posts.create",
  "posts.edit",
  "posts.delete",
  "admin.dashboard",
  "admin.settings",
];

app.use(PermissionPlugin, { permissions });
```

Check with wildcards:

```vue
<button v-permission="{ permissions: ['users'], mode: 'startWith' }">
  User Management
</button>
```

### Strategy 2: Role-Based Permissions

Flatten role-based access into a permission array:

```ts
// User role is "moderator"
// Map role to permissions
const rolePermissionMap = {
  admin: ["view.all", "edit.all", "delete.all", "manage.users"],
  moderator: ["view.all", "edit.own", "delete.own"],
  user: ["view.own", "edit.own"],
};

const userRole = "moderator";
const permissions = rolePermissionMap[userRole];

app.use(PermissionPlugin, { permissions });
```

### Strategy 3: Feature Flags as Permissions

Use permission names as feature flags:

```ts
const permissions = [
  "feature.darkMode",
  "feature.newDashboard",
  "feature.advancedAnalytics",
  "beta.aiAssistant",
];

app.use(PermissionPlugin, { permissions });
```

Check in templates:

```vue
<template>
  <div v-if="featureEnabled('advancedAnalytics')">
    <AnalyticsPanel />
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync: featureEnabled } = usePermission();
</script>
```

## Storage Behavior

### Automatic Persistence

When `persist: true` (default), permissions are automatically saved to localStorage:

```ts
// This is saved automatically
app.use(PermissionPlugin, {
  permissions: ["user.view", "user.edit"],
  persist: true, // default
});
```

Stored as Base64-encoded JSON in `localStorage`:

```
Key: __v_permission_cache__
Value: eyJwZXJtaXNzaW9ucyI6WyJ1c2VyLnZpZXciLCJ1c2VyLmVkaXQiXX0=
```

### Manual Storage Management

Use the storage utilities for explicit control:

```ts
import {
  getPermissionsFromStorage,
  savePermissionsToStorage,
  clearPermissionCache,
} from "vue-nuxt-permission";

// Save to storage
savePermissionsToStorage(["admin", "editor"]);

// Retrieve from storage
const stored = getPermissionsFromStorage();

// Clear cache
clearPermissionCache();
```

### Clearing Stored Permissions

Permissions are stored locally. To clear them (e.g., on logout):

```ts
import { usePermission } from "vue-nuxt-permission";

const { setPermissions } = usePermission();

// On logout
setPermissions([]);
```

Or use the storage utilities:

```ts
import { clearPermissionCache } from "vue-nuxt-permission";

clearPermissionCache();
```

## Refresh & Cache Management

### Reactive Permissions

Permissions are reactive throughout the application. Changes to permission arrays update all directives and composables instantly:

```ts
// main.ts
import { ref } from "vue";

const userPermissions = ref(["user.view"]);

app.use(PermissionPlugin, {
  permissions: userPermissions,
});

// Later, update permissions
userPermissions.value = ["user.view", "user.edit", "admin.panel"];
// All v-permission directives and usePermission composables update immediately
```

### Manual Cache Refresh

Clear the internal permission cache when needed:

```ts
import { usePermission, clearPermissionCache } from "vue-nuxt-permission";

const { refresh } = usePermission();

// Option 1: Refresh from current source
refresh();

// Option 2: Clear cache explicitly
clearPermissionCache();

// Option 3: Set new permissions
const { setPermissions } = usePermission();
setPermissions(["new.permission"]);
```

### Cache Details

The plugin caches permission evaluation results for performance. A cache entry is automatically invalidated when:

- `setPermissions()` is called
- `refresh()` is called
- `clearPermissionCache()` is called
- Permissions are changed at the global config level

## SSR Considerations

### Development Mode

In SSR environments, be aware of hydration:

```ts
// Only enable development mode on client
app.use(PermissionPlugin, {
  permissions: [],
  developmentMode:
    process.env.NODE_ENV === "development" && typeof window !== "undefined",
});
```

### Persistent Hydration

If permissions are stored in localStorage, they are hydrated on page load:

```ts
app.use(PermissionPlugin, {
  fetchPermissions: async () => {
    // Fetch on server or client
    if (typeof window === "undefined") {
      // Server-side: return empty
      return [];
    }
    // Client-side: load from localStorage or API
    const response = await fetch("/api/user/permissions");
    return response.json();
  },
});
```

## Multiple App Instances

If you have multiple Vue apps on the same page, each must be configured independently:

```ts
// App 1
const app1 = createApp(App1);
app1.use(PermissionPlugin, {
  permissions: ["app1.feature"],
});
app1.mount("#app1");

// App 2
const app2 = createApp(App2);
app2.use(PermissionPlugin, {
  permissions: ["app2.feature"],
});
app2.mount("#app2");
```

Note: localStorage is shared across both apps. Use distinct cache keys if needed.

## Common Configuration Patterns

### API-Driven Permissions

Fetch permissions from an authentication API on startup:

```ts
app.use(PermissionPlugin, {
  fetchPermissions: async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return [];

    try {
      const response = await fetch("/api/user/permissions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch permissions");
      const { permissions } = await response.json();
      return permissions;
    } catch (error) {
      console.error("Permission fetch failed:", error);
      return [];
    }
  },
});
```

### Role-Based Configuration

Dynamically configure based on user role:

```ts
const userRole = localStorage.getItem("userRole") || "guest";
const rolePerms = {
  admin: ["all"],
  editor: ["posts.create", "posts.edit"],
  reader: ["posts.view"],
  guest: [],
};

app.use(PermissionPlugin, {
  permissions: rolePerms[userRole] || [],
});
```

### Development Mode with Mock Permissions

Use mock permissions during development:

```ts
const isDev = process.env.NODE_ENV === "development";
const permissions = isDev
  ? ["admin", "editor", "user"] // Full access in dev
  : await fetchRealPermissions();

app.use(PermissionPlugin, {
  permissions,
  developmentMode: isDev,
});
```

````

#### Role-Based Structure

```typescript
permission: {
  permissions: [
    // User permissions
    "user:view",
    "user:edit:own",
    // Post permissions
    "post:create",
    "post:edit:own",
    "post:delete:own",
    // Admin permissions
    "admin:users:manage",
    "admin:posts:moderate",
    "admin:system:config",
  ];
}
````

## Permission Sources

### From Hard-Coded List

Simple setup for development or small applications:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    permissions: ["user.view", "post.edit"],
  },
});
```

### From API / Database

Load permissions dynamically from your backend:

```typescript
// plugins/permission.ts
export default defineNuxtPlugin(async (nuxtApp) => {
  const { $fetch } = useAsyncData;

  try {
    // Fetch user permissions from API
    const response = await fetch("/api/user/permissions");
    const { permissions } = await response.json();

    // Plugin is configured with these permissions
    return {
      provide: {
        permissions: permissions,
      },
    };
  } catch (error) {
    console.error("Failed to load permissions:", error);
    return {
      provide: {
        permissions: [],
      },
    };
  }
});
```

### From Authentication Store

Load permissions from your authentication system:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    // Will be populated after auth
    permissions: [],
  },
});

// plugins/auth.ts
export default defineNuxtPlugin(async (nuxtApp) => {
  const authStore = useAuthStore();

  // After user is authenticated
  if (authStore.user) {
    // Update permissions in the permission plugin
    // See "Refreshing Permissions" section
  }
});
```

## Refreshing Permissions

### Update Permissions at Runtime

```typescript
import { usePermission } from "vue-nuxt-permission";

const { refresh } = usePermission();

// Refresh permissions from the source
await refresh();

// Or set new permissions directly
await refresh(["user.view", "post.edit", "admin.access"]);
```

### Refresh After Login

```vue
<script setup lang="ts">
import { usePermission } from "vue-nuxt-permission";

const { refresh } = usePermission();
const authStore = useAuthStore();

async function handleLogin(credentials) {
  // Authenticate user
  await authStore.login(credentials);

  // Refresh permissions from backend
  await refresh();

  // Navigate to dashboard
  navigateTo("/dashboard");
}
</script>
```

### Refresh After Role Change

```typescript
// Handle role change in real-time
watch(
  () => authStore.user?.role,
  async (newRole) => {
    if (newRole) {
      // Fetch new permissions for the role
      const response = await fetch(`/api/roles/${newRole}/permissions`);
      const { permissions } = await response.json();

      // Update permissions
      await usePermission().refresh(permissions);
    }
  }
);
```

## Storage Integration

### Built-in LocalStorage

Permissions are cached by default. To persist across page reloads:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    permissions: ["user.view"],
    storage: "localStorage", // Enable localStorage caching
  },
});
```

### Custom Storage Adapter

Implement a custom storage strategy:

```typescript
// utils/customPermissionStorage.ts
export const customStorage = {
  getPermissions: async () => {
    // Fetch from custom source
    const response = await fetch("/api/permissions");
    return response.json();
  },

  setPermissions: async (permissions: string[]) => {
    // Save to custom source
    await fetch("/api/permissions", {
      method: "PUT",
      body: JSON.stringify(permissions),
    });
  },

  clearPermissions: async () => {
    // Clear from custom source
    await fetch("/api/permissions", {
      method: "DELETE",
    });
  },
};

// nuxt.config.ts
import { customStorage } from "./utils/customPermissionStorage";

export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    permissions: ["user.view"],
    storage: customStorage,
  },
});
```

### SessionStorage for Tab-Specific Permissions

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    permissions: ["user.view"],
    storage: "sessionStorage", // Per-tab caching
  },
});
```

## Permission Caching

### How Caching Works

Permissions are automatically cached after the first evaluation for performance:

```typescript
const { hasPermission } = usePermission();

// First call: evaluates permission
await hasPermission("user.view"); // Checks against permissions array

// Subsequent calls: uses cache
await hasPermission("user.view"); // Returns cached result instantly
```

### Clear Cache

```typescript
const { refresh } = usePermission();

// Clear cache and refresh from source
await refresh();
```

## Development Configuration

### Enable Debug Logging

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    permissions: ["user.view"],
    debug: true, // Shows [v-permission:...] logs in console
  },
});
```

### Runtime Configuration

Override configuration at runtime:

```typescript
import { configurePermission } from "vue-nuxt-permission";

// Update configuration
configurePermission({
  permissions: ["user.view", "post.edit"],
  debug: true,
});
```

## TypeScript Configuration

### Type-Safe Permissions

Define permission types for better IDE support:

```typescript
// types/permissions.ts
export type Permission =
  | "user.view"
  | "user.create"
  | "user.edit"
  | "user.delete"
  | "post.view"
  | "post.edit"
  | "post.delete"
  | "admin.access";

// Usage
import type { Permission } from "~/types/permissions";
import { usePermission } from "vue-nuxt-permission";

const { hasPermission } = usePermission();

// Now TypeScript checks permission values
await hasPermission("user.view"); // ✓ OK
await hasPermission("invalid.perm"); // ✗ Type error
```

## Common Patterns

### Load Permissions with User Data

```typescript
// middleware/load-permissions.ts
export default defineRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore();

  if (!authStore.user) {
    return navigateTo("/login");
  }

  // User is authenticated, permissions were loaded
  // See auth plugin implementation
});
```

### Conditional Permission Loading

```typescript
// Only load admin permissions if user is admin
const { refresh } = usePermission();
const authStore = useAuthStore();

if (authStore.user?.role === "admin") {
  await refresh(["admin.access", "users.manage", "system.config"]);
}
```
