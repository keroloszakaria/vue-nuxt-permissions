# Getting Started

Get up and running with vue-nuxt-permission in minutes. This guide covers the basic setup and your first permission checks.

## Before You Start

Ensure you have:

- Node.js 16+
- Vue 3 or Nuxt 3
- npm, yarn, or pnpm

## Installation

```bash
npm install vue-nuxt-permission
```

## First Permission Setup

### Nuxt 3

Add the module to your `nuxt.config.ts`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    permissions: ["read", "write", "delete", "admin"],
  },
});
```

### Vue 3

Install the plugin in your `main.ts`:

```ts
// main.ts
import { createApp } from "vue";
import PermissionPlugin from "vue-nuxt-permission";
import App from "./App.vue";

const app = createApp(App);

app.use(PermissionPlugin, {
  permissions: ["read", "write", "delete", "admin"],
});

app.mount("#app");
```

## Your First Directive

The `v-permission` directive shows or hides elements based on permissions.

```vue
<template>
  <div class="post">
    <h1>Blog Post</h1>
    <p>Post content here...</p>

    <!-- Only shows if user has 'write' permission -->
    <button v-permission="'write'">Edit Post</button>

    <!-- Only shows if user has 'delete' permission -->
    <button v-permission="'delete'">Delete Post</button>

    <!-- Only shows if user has 'admin' permission -->
    <div v-permission="'admin'">
      <h3>Admin Controls</h3>
      <!-- Admin-only content -->
    </div>
  </div>
</template>
```

By default, elements without the required permission are completely removed from the DOM.

## Your First Composable

The `usePermission()` composable provides permission checking in JavaScript.

```vue
<template>
  <div>
    <button @click="editPost" :disabled="!canEdit">
      {{ canEdit ? "Edit" : "Not Allowed" }}
    </button>
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { can, canSync } = usePermission();

// Sync check for immediate use in templates
const canEdit = canSync("write");

const editPost = async () => {
  if (await can("write")) {
    // Perform edit operation
  }
};
</script>
```

## Using Multiple Permissions

Check if user has multiple permissions with `hasAll()` or `hasAny()`:

```ts
import { usePermission } from "vue-nuxt-permission";

const { hasAny, hasAll } = usePermission();

// User must have BOTH permissions
const isEditor = await hasAll(["write", "review"]);

// User must have EITHER permission
const canModify = await hasAny(["write", "edit"]);
```

## Your First Route Guard

Protect routes based on permissions using Nuxt middleware:

```ts
// middleware/admin.ts
export default defineRouteMiddleware(async (to, from) => {
  const { can } = usePermission();

  if (!(await can("admin"))) {
    return navigateTo("/");
  }
});
```

Then add the middleware to your route:

```vue
<!-- pages/admin/dashboard.vue -->
<template>
  <div>
    <h1>Admin Dashboard</h1>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: "admin",
});
</script>
```

## Managing Permissions

Permissions are defined when setting up the plugin. To update permissions at runtime, use the `refresh()` method:

```ts
const { refresh } = usePermission();

// Call this when permissions change (e.g., after user login)
refresh();
```

## Common Scenarios

### Admin Dashboard

Only admin users should see the admin section:

```vue
<template>
  <div>
    <AdminPanel v-permission="'admin'" />
  </div>
</template>
```

### Edit Controls

Show edit/delete buttons only when user has permission:

```vue
<template>
  <div class="card">
    <h2>{{ item.title }}</h2>
    <button v-permission="'write'">Edit</button>
    <button v-permission="'delete'">Delete</button>
  </div>
</template>
```

### Feature Flags

Use permissions as feature flags:

```vue
<template>
  <div>
    <!-- New feature only visible if user has 'beta-features' -->
    <BetaFeature v-permission="'beta-features'" />
  </div>
</template>
```

### Conditional Rendering with Logic

```ts
const { hasPermission, hasAny } = usePermission();

// Show advanced options if user is moderator or admin
const showAdvanced = await hasAny(["moderator", "admin"]);

// Only allow deletion if user is owner AND has delete permission
const canDelete = isOwner && (await hasPermission("delete"));
```

## Next Steps

- [Configuration](./configuration) - Configure permissions and storage
- [Directive Reference](./api/v-permission) - Complete directive API
- [Composable Reference](./api/usePermission) - Complete composable API
- [Quick Reference](./quick-reference) - Copy-paste patterns
- [Advanced Usage](./usage/advanced) - Complex scenarios

## Troubleshooting

### Elements Still Showing Without Permission

Make sure you've defined the permission in your config:

```ts
permission: {
  permissions: ['read', 'write', 'admin'], // Include your permissions
}
```

### usePermission() is Undefined

Ensure the plugin is properly installed:

```ts
// Nuxt: Add to modules list
modules: ['vue-nuxt-permission']

// Vue: Call before mount
app.use(PermissionPlugin, { permissions: [...] })
```

### Permissions Not Updating

Call `refresh()` when permissions change:

```ts
const { refresh } = usePermission();

// After user login or permission change
refresh();
```
