# Migration Guide

## From v1 to v2

This guide covers migration from vue-nuxt-permission v1 to v2.

### Installation

The installation method remains the same:

```bash
npm install vue-nuxt-permission@latest
```

### Configuration

Configuration structure is similar but with some updates:

#### Before (v1)

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    permissions: ["user.view", "post.edit"],
    mode: "development",
  },
});
```

#### After (v2)

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],

  permission: {
    permissions: ["user.view", "post.edit"],
    debug: true, // Use 'debug' instead of 'mode'
  },
});
```

### API Changes

#### usePermission Composable

The composable remains similar but with improved type support:

```typescript
// v1
const { hasPermission, permissions } = usePermission();
const result = hasPermission("user.view");

// v2
const { hasPermission, permissions } = usePermission();
const result = await hasPermission("user.view"); // Always returns Promise
```

#### New Methods

New utility methods added in v2:

```typescript
const { hasAll, hasAny, refresh } = usePermission();

// v2 - Check all permissions (AND)
await hasAll(["post.edit", "post.publish"]);

// v2 - Check any permission (OR)
await hasAny(["editor", "moderator"]);

// v2 - Refresh permissions
await refresh();
```

### Directive Changes

The directive API is backward compatible, but some behaviors improved:

#### Element Removal Behavior

v2 properly removes elements from DOM and replaces them with comment placeholders for later restoration:

```vue
<!-- Works the same, but with better restoration -->
<button v-permission="'admin.delete'">Delete</button>
```

#### Modifier Improvements

New modifiers in v2:

```vue
<!-- v2 - New modifiers -->
<div v-permission.once="'admin'">Checked once on mount</div>
<div v-permission.lazy="'view'">Lazy evaluation</div>
```

### Breaking Changes

#### Removed Features

- Removed `v-permission:auto` modifier (use default behavior)
- Removed `permissionFailed` callback (use middleware instead)

#### Behavior Changes

1. **Async checks are now always async**

   ```typescript
   // Before: could be sync
   const result = hasPermission("user.view");

   // After: always async
   const result = await hasPermission("user.view");
   ```

2. **Route meta structure**
   ```typescript
   // Old way still works, but TypeScript is stricter
   definePageMeta({
     permission: "admin.access",
   });
   ```

### Migration Checklist

- [ ] Update package.json version
- [ ] Review configuration changes
- [ ] Update async permission checks (add `await`)
- [ ] Test route guards with new middleware syntax
- [ ] Verify permission removal/hiding behavior
- [ ] Update TypeScript definitions if custom

### Common Issues

#### "hasPermission is not async"

In v2, `hasPermission()` always returns a Promise. Wrap with `await`:

```typescript
// Before (v1)
const canEdit = hasPermission("post.edit");

// After (v2)
const canEdit = await hasPermission("post.edit");
```

#### Permissions not persisting

Check storage configuration:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  permission: {
    permissions: ["user.view"],
    storage: "localStorage", // Explicitly enable
  },
});
```

#### Route guards not working

Update middleware syntax:

```typescript
// Before (v1)
// middleware/admin.js
export default function (context) {
  // ...
}

// After (v2)
// middleware/admin.ts
export default defineRouteMiddleware(async (to, from) => {
  // ...
});
```

### Full Example Migration

#### Before (v1)

```vue
<!-- pages/admin.vue -->
<template>
  <div v-if="isAdmin">
    <h1>Admin Panel</h1>
    <button @click="deleteUser">Delete</button>
  </div>
</template>

<script setup lang="ts">
import { usePermission } from "vue-nuxt-permission";

const { hasPermission } = usePermission();
const isAdmin = ref(false);

onMounted(() => {
  isAdmin.value = hasPermission("admin.access");
});

async function deleteUser() {
  if (isAdmin.value && hasPermission("user.delete")) {
    await api.deleteUser();
  }
}
</script>
```

#### After (v2)

```vue
<!-- pages/admin.vue -->
<template>
  <div>
    <h1 v-permission="'admin.access'">Admin Panel</h1>
    <button v-permission="'user.delete'" @click="deleteUser">Delete</button>
  </div>
</template>

<script setup lang="ts">
import { usePermission } from "vue-nuxt-permission";

const { hasAll } = usePermission();

definePageMeta({
  middleware: "permission",
  permission: "admin.access",
});

async function deleteUser() {
  // Permission already checked by middleware
  // Can proceed directly
  if (await hasAll(["admin.access", "user.delete"])) {
    await api.deleteUser();
  }
}
</script>
```

## Upgrading Dependencies

Ensure you have compatible versions:

```json
{
  "devDependencies": {
    "vue": "^3.3.0",
    "nuxt": "^3.5.0",
    "typescript": "^5.0.0"
  }
}
```

## Need Help?

If you encounter issues:

1. Check the [FAQ](/faq) for common problems
2. Review [Advanced](/advanced) usage patterns
3. Enable debug logging: `debug: true` in configuration
4. Check console for `[v-permission:...]` logs
