# PWA and SSR

Server-side rendering, static generation, progressive enhancement, and PWA considerations.

## SSR (Server-Side Rendering)

### Server-Side Rendering with Nuxt

Permissions are client-side only. On the server, permissions are empty by default:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    // Empty on server
    permissions: [],
    developmentMode: false,
  },

  ssr: true, // Enable SSR
});
```

### Handling Permissions in SSR

When rendering on the server, always verify permissions server-side:

```ts
// server/api/protected-data.ts
export default defineEventHandler(async (event) => {
  // Server-side permission check
  const user = await verifyUserToken(event);

  if (!user || !user.permissions.includes("admin")) {
    throw createError({
      statusCode: 403,
      message: "Forbidden",
    });
  }

  return {
    data: "Admin only data",
  };
});
```

Then fetch on the client:

```vue
<template>
  <div>
    <div v-if="data">{{ data }}</div>
    <div v-else>Loading...</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const data = ref(null);

onMounted(async () => {
  try {
    const response = await fetch("/api/protected-data");
    if (!response.ok) throw new Error("Forbidden");
    const result = await response.json();
    data.value = result.data;
  } catch (error) {
    data.value = null;
  }
});
</script>
```

### Avoiding Hydration Mismatch

Hydration mismatch occurs when server-rendered HTML differs from client-rendered HTML. Avoid permission checks during SSR rendering:

```vue
<!-- ❌ Wrong: Elements rendered on server may differ from client -->
<template>
  <button v-permission="'admin'">Admin Only</button>
</template>

<!-- ✅ Correct: Use ClientOnly wrapper -->
<template>
  <ClientOnly>
    <button v-permission="'admin'">Admin Only</button>
  </ClientOnly>
</template>
```

With `<ClientOnly>`:

```vue
<template>
  <div>
    <!-- Rendered on client only -->
    <ClientOnly>
      <AdminPanel v-permission="'admin'" />
    </ClientOnly>

    <!-- Rendered on both server and client -->
    <PublicContent />
  </div>
</template>
```

### Server-Only Routes

Protect routes with server-side middleware:

```ts
// middleware/server-only.ts
export default defineRouteMiddleware((to, from) => {
  // Server-side check (executed on server AND client during hydration)
  if (process.server) {
    const user = useRequestEvent().node.req.user;
    if (!user || !user.hasPermission("admin")) {
      throw createError({
        statusCode: 403,
        message: "Forbidden",
      });
    }
  }
});
```

## Static Generation (SSG)

### Pre-Rendering with Permissions

For static sites, pre-render permission-protected content at build time:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    // These will be available during build
    permissions: ["user.view", "user.edit"],
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ["/", "/admin", "/dashboard"],
      // Only for authenticated/authorized routes
      ignore: ["/admin/**"], // Don't crawl admin routes
    },
  },

  // Or use dynamic route generation
  routeRules: {
    "/admin/**": { swr: 3600 }, // Cache for 1 hour
  },
});
```

### Static Pages with Permission Checks

Use fallback content for permission-protected pages:

```vue
<!-- pages/admin.vue -->
<template>
  <div>
    <!-- Server-rendered (always shows on first load) -->
    <AdminPanel v-if="isAdmin" />

    <!-- Fallback for non-admin users -->
    <p v-else>You don't have permission to access this page.</p>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
const isAdmin = ref(false);

// During SSR/SSG, permissions are empty
// On client, check after hydration
onMounted(async () => {
  isAdmin.value = canSync("admin");
});
</script>
```

## Progressive Enhancement

### Graceful Degradation

Ensure the app works even if permissions aren't loaded:

```vue
<template>
  <div>
    <!-- Always visible -->
    <h1>Welcome</h1>

    <!-- Visible if permissions available -->
    <button v-if="permissionsLoaded && canEdit">Edit</button>

    <!-- Fallback if permissions not yet loaded -->
    <button v-else>Loading...</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
const permissionsLoaded = ref(false);
const canEdit = ref(false);

onMounted(() => {
  // Simulate permission loading delay
  setTimeout(() => {
    canEdit.value = canSync("edit");
    permissionsLoaded.value = true;
  }, 100);
});
</script>
```

### Skeleton Loading States

Display loading skeletons while permissions load:

```vue
<template>
  <div>
    <!-- Skeleton while loading -->
    <div v-if="!loaded" class="skeleton">
      <div class="skeleton-button"></div>
      <div class="skeleton-button"></div>
    </div>

    <!-- Real content after loading -->
    <div v-else class="controls">
      <button v-if="canEdit">Edit</button>
      <button v-if="canDelete">Delete</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
const loaded = ref(false);

onMounted(() => {
  // Simulate load delay
  setTimeout(() => {
    loaded.value = true;
  }, 300);
});
</script>

<style scoped>
.skeleton-button {
  height: 40px;
  background: #e0e0e0;
  border-radius: 4px;
  margin: 8px 0;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
```

## PWA (Progressive Web App) Considerations

### Service Worker Strategy

Permissions should not be cached in the service worker (they change per user):

```ts
// service-worker.ts
self.addEventListener("install", (event) => {
  // Cache static assets only, NOT permissions
  event.waitUntil(
    caches.open("v1").then((cache) => {
      return cache.addAll([
        "/",
        "/index.html",
        "/styles.css",
        "/script.js",
        // Do NOT cache /api/* endpoints that include permissions
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Let API calls pass through (don't cache)
  if (event.request.url.includes("/api/")) {
    return;
  }

  // Cache static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

### Offline Fallback

Handle offline state gracefully:

```vue
<template>
  <div>
    <div v-if="isOnline" class="online">
      <!-- Full functionality when online -->
      <button v-permission="'edit'">Edit</button>
    </div>

    <div v-else class="offline">
      <!-- Limited functionality when offline -->
      <p>You are offline. Some features are unavailable.</p>
      <button disabled>Edit (Offline)</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const isOnline = ref(navigator.onLine);

const handleOnline = () => {
  isOnline.value = true;
};

const handleOffline = () => {
  isOnline.value = false;
};

onMounted(() => {
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
});

onUnmounted(() => {
  window.removeEventListener("online", handleOnline);
  window.removeEventListener("offline", handleOffline);
});
</script>
```

### Caching Strategies

Cache permissions only in volatile storage (sessionStorage):

```ts
// composables/usePermissions.ts
import { usePermission } from "vue-nuxt-permission";

export const usePermissionsCache = () => {
  const { can, setPermissions } = usePermission();

  // Load from sessionStorage (not persistent across tabs)
  const loadFromCache = () => {
    const cached = sessionStorage.getItem("__temp_permissions__");
    if (cached) {
      setPermissions(JSON.parse(cached));
    }
  };

  // Save to sessionStorage temporarily
  const saveToCache = (perms: string[]) => {
    sessionStorage.setItem("__temp_permissions__", JSON.stringify(perms));
  };

  return {
    loadFromCache,
    saveToCache,
  };
};
```

## Hydration Safety

### Safe Initialization

Ensure permissions are initialized correctly after hydration:

```ts
// plugins/permission.client.ts (client-side only)
export default defineNuxtPlugin(async () => {
  // Load permissions only on client
  const response = await fetch("/api/user/permissions");
  const { permissions } = await response.json();

  // Update via context
  const permissionStore = usePermissionStore();
  permissionStore.updatePermissions(permissions);
});
```

### Testing SSR Hydration

Test that your app works with different permission states:

```ts
// tests/ssr.spec.ts
import { render } from "@vue/test-utils";
import App from "../App.vue";

describe("SSR Hydration", () => {
  it("renders without permissions on server", () => {
    // Simulate server render (no permissions)
    const wrapper = render(App, {
      props: {
        permissions: [],
      },
    });

    expect(wrapper.text()).not.toContain("Admin Panel");
  });

  it("renders with permissions on client", async () => {
    const wrapper = render(App, {
      props: {
        permissions: ["admin"],
      },
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Admin Panel");
  });
});
```

## Performance Optimization

### Lazy Load Permission-Protected Components

```vue
<template>
  <div>
    <!-- Lazy load admin components only for admins -->
    <AdminPanel v-if="canSync('admin')" lazy-load />
  </div>
</template>

<script setup>
import { defineAsyncComponent } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();

const AdminPanel = defineAsyncComponent(() => import("./AdminPanel.vue"));
</script>
```

### Code Splitting by Role

```ts
// utils/dynamicImport.ts
import type { Component } from "vue";
import { defineAsyncComponent } from "vue";

export const loadComponentByRole = (role: string): Component => {
  const components: Record<string, () => Promise<Component>> = {
    admin: () => import("~/pages/admin/Dashboard.vue"),
    editor: () => import("~/pages/editor/Dashboard.vue"),
    user: () => import("~/pages/user/Dashboard.vue"),
  };

  return defineAsyncComponent(components[role] || components.user);
};
```

Usage:

```vue
<script setup>
import { computed } from "vue";
import { usePermissionStore } from "~/stores/permission";
import { loadComponentByRole } from "~/utils/dynamicImport";

const permStore = usePermissionStore();

const DashboardComponent = computed(() => {
  const role = permStore.isAdmin ? "admin" : "user";
  return loadComponentByRole(role);
});
</script>

<template>
  <component :is="DashboardComponent" />
</template>
```

## Build-Time Optimization

### Static Permissions List

If permissions are static, define them at build time:

```ts
// nuxt.config.ts
const STATIC_PERMISSIONS = [
  "user.view",
  "user.create",
  "user.edit",
  "post.view",
  "post.create",
];

export default defineNuxtConfig({
  permission: {
    permissions: STATIC_PERMISSIONS,
  },

  // Make available as import
  define: {
    __STATIC_PERMISSIONS__: JSON.stringify(STATIC_PERMISSIONS),
  },
});
```

### Environment-Based Permissions

```ts
// nuxt.config.ts
const permissionsByEnv = {
  development: ["admin", "editor", "user"],
  staging: ["editor", "user"],
  production: ["user"],
};

export default defineNuxtConfig({
  permission: {
    permissions: permissionsByEnv[process.env.NODE_ENV],
  },
});
```
