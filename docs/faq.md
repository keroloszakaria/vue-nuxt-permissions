# Frequently Asked Questions

Common questions and answers about vue-nuxt-permission behavior and usage.

## General Questions

### What is a "permission"?

A permission is a string that represents an authorization or capability. Examples: `"admin"`, `"user.edit"`, `"posts.delete"`, `"feature.darkMode"`.

Your application defines what permissions mean. The plugin simply evaluates whether a user has them.

### How do I define permissions in my app?

You define permissions as part of your configuration:

```ts
app.use(PermissionPlugin, {
  permissions: ["user.view", "user.create", "user.edit", "user.delete"],
});
```

Permissions typically come from your authentication system (e.g., an API response after login).

### Can I change permissions at runtime?

Yes. Use `usePermission().setPermissions()` to update permissions at any time:

```ts
const { setPermissions } = usePermission();
setPermissions(["new.permission"]);
```

All directives and composables update automatically.

### Do permissions work with refs (reactive arrays)?

Yes. You can pass a reactive `Ref<string[]>`:

```ts
const userPerms = ref(["admin"]);

app.use(PermissionPlugin, {
  permissions: userPerms,
});

// Later, update reactively
userPerms.value = ["editor"];
```

## Directive Questions

### Why is the element removed from the DOM instead of hidden?

By default, `v-permission` removes elements without the required permission entirely from the DOM:

```vue
<button v-permission="'admin'">Admin Only</button>
```

If the user lacks `"admin"` permission, the `<button>` is removed from the DOM completely. This is the default behavior.

### What's the difference between "show" and "remove"?

| Mode             | Behavior                  | DOM             | CSS            | Use Case                        |
| ---------------- | ------------------------- | --------------- | -------------- | ------------------------------- |
| Remove (default) | Removes from DOM          | Element absent  | N/A            | Sensitive UI, security-critical |
| Show (`:show`)   | Hides with `display:none` | Element present | `display:none` | Temporary hiding, debugging     |

**Remove (default)**:

```vue
<button v-permission="'admin'">Delete</button>
<!-- If no 'admin' permission: element is completely removed from DOM -->
```

**Show modifier**:

```vue
<button v-permission:show="'admin'">Delete</button>
<!-- If no 'admin' permission: element stays in DOM but hidden with display:none -->
```

### When should I use `:show` vs default removal?

Use **`:show`** when:

- The element is temporary or cosmetic
- You want to preserve layout/styling with hidden elements
- Debugging (inspect in DevTools)
- Testing requires the element in the DOM

Use **default removal** when:

- The element is sensitive (buttons, forms)
- You want to hide it completely from view and DOM
- Security-sensitive features
- You want to ensure removed code can't be accessed

### Can I use v-permission on component-level?

No. The directive must be used on DOM elements:

```vue
<!-- ❌ Wrong: components don't support directives like this -->
<MyComponent v-permission="'admin'" />

<!-- ✅ Correct: wrap component or use permission checks inside it -->
<div v-permission="'admin'">
  <MyComponent />
</div>

<!-- ✅ Or check permission inside the component -->
<script setup>
import { usePermission } from "vue-nuxt-permission";
const { canSync } = usePermission();

if (!canSync("admin")) {
  throw createError({ statusCode: 403 });
}
</script>
```

### How do I apply multiple directives on one element?

You can't apply `v-permission` twice. Use complex permission objects instead:

```vue
<!-- ❌ Don't do this -->
<button v-permission="'admin'" v-permission="'verified'"></button>

<!-- ✅ Use AND mode -->
<button v-permission="{ permissions: ['admin', 'verified'], mode: 'and' }">
  Sensitive Action
</button>
```

### Does v-permission work in modals/overlays?

Yes. The directive works on any DOM element, including those in modals:

```vue
<template>
  <div class="modal" v-show="showModal">
    <button v-permission="'admin'">Admin Action</button>
  </div>
</template>
```

## Composable Questions

### What's the difference between `can()` and `canSync()`?

| Method      | Async             | Speed           | Use Case                 |
| ----------- | ----------------- | --------------- | ------------------------ |
| `can()`     | Yes (async/await) | Slightly slower | Logic, watchers, effects |
| `canSync()` | No (instant)      | Fast            | Templates, conditionals  |

**Use `can()` in logic**:

```ts
const { can } = usePermission();

const handleDelete = async () => {
  const allowed = await can("post.delete");
  if (!allowed) return;
  // Delete logic
};
```

**Use `canSync()` in templates**:

```vue
<script setup>
const { canSync } = usePermission();
</script>

<template>
  <button v-if="canSync('admin')">Admin Panel</button>
</template>
```

### Can I use usePermission() outside of components?

Yes, but be cautious with reactivity. `usePermission()` returns reactive references:

```ts
// utils/auth.ts
import { usePermission } from "vue-nuxt-permission";

export const checkUserPermission = async (perm) => {
  const { can } = usePermission();
  return await can(perm);
};
```

However, this only works when Vue app context exists (in components, composables, setup functions).

### How do I check multiple permissions at once?

Use the helper methods:

```ts
const { hasAll, hasAny } = usePermission();

// All required
const canAdminister = await hasAll(["admin", "verified"]);

// At least one
const hasEditAccess = await hasAny(["posts.edit", "admin"]);
```

Or use permission objects:

```vue
<!-- All (AND) -->
<div v-permission="{ permissions: ['admin', 'verified'], mode: 'and' }">
  Requires both
</div>

<!-- Any (OR) -->
<div v-permission="['admin', 'moderator']">
  Requires at least one
</div>
```

## Permission Evaluation Questions

### What happens if a permission object is invalid?

Invalid permission objects return `false` (access denied):

```ts
const { canSync } = usePermission();

// Invalid mode
canSync({ permissions: ["admin"], mode: "invalid" }); // false

// Empty permissions array
canSync({ permissions: [], mode: "and" }); // false

// Invalid regex
canSync({ permissions: ["[invalid"], mode: "regex" }); // false
```

Enable `developmentMode` to see warnings:

```ts
app.use(PermissionPlugin, {
  permissions: ["admin"],
  developmentMode: true,
});
```

### How does wildcard matching work?

Three wildcard modes are available:

**startWith**:

```vue
<!-- User has ["admin.users", "admin.posts"] -->
<div v-permission="{ permissions: ['admin'], mode: 'startWith' }">
  Shows (matches "admin.users" and "admin.posts")
</div>
```

**endWith**:

```vue
<!-- User has ["super.admin", "site.admin"] -->
<div v-permission="{ permissions: ['admin'], mode: 'endWith' }">
  Shows (matches "super.admin" and "site.admin")
</div>
```

**regex**:

```vue
<!-- User has ["user.view", "user.create"] -->
<div v-permission="{ permissions: ['^user\\.'], mode: 'regex' }">
  Shows (matches permissions starting with "user.")
</div>
```

### What's the "NOT" mode used for?

The `"not"` mode checks that the user does NOT have a permission:

```vue
<!-- Shows if user does NOT have 'guest' permission -->
<div v-permission="{ permissions: ['guest'], mode: 'not' }">
  This is hidden from guests
</div>
```

Useful for hiding content from specific roles:

```vue
<!-- Show to everyone except guests -->
<div v-permission="{ permissions: ['guest'], mode: 'not' }">
  Premium Content
</div>
```

## Storage & Caching Questions

### Where are permissions stored?

Permissions are stored in `localStorage` under the key `__v_permission_cache__`, Base64-encoded:

```
localStorage.__v_permission_cache__ = "eyJwZXJtaXNzaW9ucyI6WyJhZG1pbiJdfQ=="
```

Decode to see the actual value:

```ts
const encoded = localStorage.__v_permission_cache__;
const decoded = JSON.parse(atob(encoded));
console.log(decoded);
// { permissions: ["admin"] }
```

### How do I disable localStorage persistence?

```ts
app.use(PermissionPlugin, {
  permissions: ["admin"],
  persist: false, // Don't save to localStorage
});
```

With `persist: false`, permissions are lost on page reload.

### What's the permission cache?

The plugin caches permission evaluation results for performance. A cache entry contains the evaluation result for a specific permission/user combination.

The cache is automatically cleared when:

- `setPermissions()` is called
- `refresh()` is called
- `clearPermissionCache()` is called
- Permissions are updated at the config level

Clear the cache manually:

```ts
import { clearPermissionCache } from "vue-nuxt-permission";

clearPermissionCache();
```

### How do I persist permissions manually?

Use the storage utilities:

```ts
import {
  savePermissionsToStorage,
  getPermissionsFromStorage,
} from "vue-nuxt-permission";

// Save
savePermissionsToStorage(["admin", "editor"]);

// Load
const perms = getPermissionsFromStorage();
```

## Async & Performance Questions

### Are async operations blocking?

No. Async operations don't block the main thread:

```vue
<script setup>
const { can } = usePermission();

const checkPermission = async () => {
  const allowed = await can("admin");
  // Executed asynchronously
};
</script>
```

Use `canSync()` for instant non-blocking checks in templates.

### How is performance optimized?

The plugin uses:

1. **Caching**: Results are cached to avoid re-evaluation
2. **Sync mode**: `canSync()` for instant checks without overhead
3. **Lazy evaluation**: Only checks when needed (directives, composables)

For large permission sets, use pattern matching:

```vue
<!-- Instead of checking each individually -->
<div v-permission="{ permissions: ['admin'], mode: 'startWith' }">
  Matches any permission starting with "admin"
</div>
```

## SSR & Framework Questions

### Does v-permission work with SSR?

Permissions are client-side only. On the server, directives and composables behave as if no permissions are granted:

```ts
// Nuxt SSR
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],
  permission: {
    permissions: [], // Empty on server
  },
});
```

Always handle permission-protected content with server-side checks:

```ts
// server/api/protected.ts
export default defineEventHandler(async (event) => {
  const user = await verifyToken(event);
  if (!user.hasPermission("admin")) {
    throw createError({ statusCode: 403 });
  }
  return { data: "admin only" };
});
```

### How do I handle SSR hydration mismatch?

During SSR, use `process.server` to control behavior:

```ts
app.use(PermissionPlugin, {
  permissions: process.server ? [] : await fetchPermissions(),
});
```

Or client-only components:

```vue
<template>
  <div v-if="!$fetchState.pending">
    <button v-permission="'admin'">Admin Only</button>
  </div>
</template>
```

### Does v-permission work in Nuxt middleware?

Yes. Use the composable in middleware:

```ts
// middleware/check-permissions.ts
import { usePermission } from "vue-nuxt-permission";

export default defineRouteMiddleware(async (to, from) => {
  const { can } = usePermission();

  if (to.meta.requiresAdmin) {
    const isAdmin = await can("admin");
    if (!isAdmin) {
      return navigateTo("/");
    }
  }
});
```

## Troubleshooting Questions

### Elements are still showing even with v-permission

Ensure:

1. Permissions are configured correctly
2. The permission name matches exactly
3. `developmentMode: true` to see evaluation logs

```ts
app.use(PermissionPlugin, {
  permissions: ["admin"],
  developmentMode: true, // Enable logs
});
```

Check the console for debug output.

### Permission changes don't update the UI

If using static arrays, they won't be reactive:

```ts
// ❌ Not reactive
const perms = ["admin"];
app.use(PermissionPlugin, { permissions: perms });
perms[0] = "editor"; // Won't update UI

// ✅ Reactive
const perms = ref(["admin"]);
app.use(PermissionPlugin, { permissions: perms });
perms.value[0] = "editor"; // Updates UI
```

Or use `setPermissions()`:

```ts
const { setPermissions } = usePermission();
setPermissions(["new.permission"]);
```

### Async permissions are not resolving

Ensure you're using `can()` (async) and awaiting:

```ts
// ❌ Wrong
const allowed = can("admin"); // Returns a Promise
if (allowed) {
} // This is always true

// ✅ Correct
const allowed = await can("admin"); // Awaits the Promise
if (allowed) {
}
```

Or use `canSync()` for sync checking.
];
}

````

Choose a naming scheme that makes sense for your application. Common patterns:

- `resource.action` (user.edit, post.delete)
- `role:permission` (admin:create, editor:publish)
- Hierarchical like `users.admin.manage`

### How do I load permissions from my API?

Create a plugin to load permissions after authentication:

```typescript
// plugins/load-permissions.ts
export default defineNuxtPlugin(async (nuxtApp) => {
  const authStore = useAuthStore();

  if (authStore.user) {
    const response = await fetch(`/api/user/${authStore.user.id}/permissions`);
    const { permissions } = await response.json();

    const { refresh } = usePermission();
    await refresh(permissions);
  }
});
````

### How do I update permissions after login?

```typescript
async function handleLogin(credentials) {
  // Authenticate user
  await authStore.login(credentials);

  // Refresh permissions
  const { refresh } = usePermission();
  await refresh();

  // Navigate to dashboard
  navigateTo("/dashboard");
}
```

### Can permissions be updated dynamically?

Yes, use the `refresh()` function:

```typescript
const { refresh } = usePermission();

// Load new permissions
const newPermissions = await fetchUserPermissions();
await refresh(newPermissions);
```

## Directive Usage

### Why is my element being removed from the DOM?

By default, when a user doesn't have the required permission, the element is completely removed from the DOM:

```vue
<!-- If permission 'admin.delete' is denied, this element is removed -->
<button v-permission="'admin.delete'">Delete</button>
```

This is useful for security (element isn't even in the DOM) but takes up no space in the layout.

### How do I hide instead of remove?

Use the `:show` modifier to hide elements with CSS instead:

```vue
<!-- If permission 'admin.delete' is denied, element is hidden with display:none -->
<button v-permission:show="'admin.delete'">Delete</button>
```

The element stays in the DOM but is invisible. The layout space is still occupied.

### What's the difference between removing and hiding?

| Aspect      | Remove                       | Hide                            |
| ----------- | ---------------------------- | ------------------------------- |
| DOM         | Element removed              | Element present                 |
| Space       | No layout space              | Layout space reserved           |
| Security    | Better (element not visible) | Worse (can inspect in DevTools) |
| CSS         | Not applicable               | `display: none` applied         |
| Restoration | Can be restored              | Can be shown again              |

### Can I use permission values from variables?

Yes, permissions can be reactive:

```vue
<script setup lang="ts">
import { ref } from "vue";

const requiredPermission = ref("user.view");
</script>

<template>
  <!-- Permission updates reactively -->
  <div v-permission="requiredPermission">Content</div>

  <button @click="requiredPermission = 'admin.access'">
    Change Required Permission
  </button>
</template>
```

### What's the difference between modifiers .once and .lazy?

| Modifier | Behavior                                       | Use Case                       |
| -------- | ---------------------------------------------- | ------------------------------ |
| `.once`  | Check permission once on mount, never update   | Elements that shouldn't change |
| `.lazy`  | Skip checks if permission value hasn't changed | Performance optimization       |

```vue
<!-- Check once on mount -->
<div v-permission.once="'admin'">Static permission check</div>

<!-- Check lazily if value changes -->
<div v-permission.lazy="permission">Lazy evaluation</div>

<!-- Both combined -->
<div v-permission.once.lazy="'admin'">Check once, never update</div>
```

## Composable Usage

### How do I check permissions in script?

Use the `usePermission()` composable:

```typescript
import { usePermission } from "vue-nuxt-permission";

const { hasPermission, hasAll, hasAny } = usePermission();

// Single permission
if (await hasPermission("admin.delete")) {
  // Delete allowed
}

// Multiple permissions (AND)
if (await hasAll(["post.edit", "post.publish"])) {
  // Both required
}

// Multiple permissions (OR)
if (await hasAny(["editor", "moderator"])) {
  // At least one required
}
```

### Are permission checks async?

They can be either:

```typescript
const { hasPermission } = usePermission();

// Async check (returns Promise)
const canEdit = await hasPermission("post.edit");

// Sync check (if already cached)
const canView = hasPermission("user.view");
```

Always use `await` to be safe. If the permission is cached, it returns instantly. If it needs to be loaded, it waits asynchronously.

### How do I check if user has any admin permission?

Use pattern matching modes:

```typescript
const { hasPermission } = usePermission();

// Check all permissions starting with 'admin.'
const isAdmin = await hasPermission({
  permissions: ["admin."],
  mode: "startWith",
});
```

Or use `hasAny()` with multiple permissions:

```typescript
const isAdmin = await hasAny(["admin.users", "admin.content", "admin.system"]);
```

## Route Protection

### How do I protect routes?

Use Nuxt middleware with the `permission` meta:

```vue
<!-- pages/admin/dashboard.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: "permission",
  permission: "admin.access",
});
</script>
```

Then create the middleware:

```typescript
// middleware/permission.ts
export default defineRouteMiddleware(async (to, from) => {
  const { hasPermission } = usePermission();

  const requiredPermission = to.meta.permission as string | undefined;

  if (requiredPermission && !(await hasPermission(requiredPermission))) {
    return navigateTo("/unauthorized");
  }
});
```

### How do I protect multiple routes?

Create specific middleware or use a more flexible pattern:

```typescript
// middleware/permission-check.ts
export default defineRouteMiddleware(async (to, from) => {
  const { hasPermission, hasAll, hasAny } = usePermission();

  const required = to.meta.permission as string | string[] | undefined;
  const requireAll = to.meta.requireAllPermissions ?? false;

  if (!required) return;

  let hasAccess = false;

  if (Array.isArray(required)) {
    hasAccess = requireAll ? await hasAll(required) : await hasAny(required);
  } else {
    hasAccess = await hasPermission(required);
  }

  if (!hasAccess) {
    return navigateTo("/unauthorized");
  }
});
```

## Performance

### Are permission checks fast?

Yes, they use caching:

```typescript
const { hasPermission } = usePermission();

// First call: evaluates and caches
await hasPermission("user.view"); // ~1ms

// Subsequent calls: instant from cache
await hasPermission("user.view"); // <0.1ms
```

### Should I cache permission checks myself?

Only if checking the same permission many times in a component:

```typescript
const { hasPermission } = usePermission()
const canEdit = ref(false)

onMounted(async () => {
  // Check once on mount
  canEdit.value = await hasPermission('post.edit')
})

// Use ref instead of checking every time
<button v-if="canEdit" @click="edit">Edit</button>
```

## Error Handling

### What happens if permission loading fails?

By default, permission checks return `false` (deny access). You can add error handling:

```typescript
const { hasPermission } = usePermission();

try {
  const canEdit = await hasPermission("post.edit");
} catch (error) {
  console.error("Permission check failed:", error);
  // Handle error
}
```

### What if permissions aren't loaded yet?

The library handles this automatically. If permissions aren't loaded, checks will wait for them to load or fail safely with `false`.

## Storage

### Do permissions persist across page reloads?

By default, no. To enable persistence, configure storage:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  permission: {
    permissions: ["user.view"],
    storage: "localStorage", // Enable persistence
  },
});
```

### Can I use custom storage?

Yes, implement a custom storage adapter:

```typescript
const customStorage = {
  getPermissions: async () => await fetch('/api/perms'),
  setPermissions: async (perms) => await fetch('/api/perms', { body: perms }),
  clearPermissions: async () => await fetch('/api/perms', { method: 'DELETE' })
}

// nuxt.config.ts
permission: {
  permissions: ['user.view'],
  storage: customStorage
}
```

## Debugging

### How do I enable debug logging?

Enable debug mode in configuration:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  permission: {
    permissions: ["user.view"],
    debug: true, // Shows [v-permission:...] logs
  },
});
```

Or enable at runtime:

```typescript
import { configurePermission } from "vue-nuxt-permission";

configurePermission({
  permissions: ["user.view"],
  debug: true,
});
```

### How do I test permission-protected components?

```typescript
import { mount } from "@vue/test-utils";
import { configurePermission } from "vue-nuxt-permission";

describe("ProtectedComponent", () => {
  it("shows when permission granted", async () => {
    configurePermission({
      permissions: ["admin.access"],
    });

    const wrapper = mount(MyComponent);
    expect(wrapper.text()).toContain("Admin Content");
  });

  it("hides when permission denied", async () => {
    configurePermission({
      permissions: [], // No permissions
    });

    const wrapper = mount(MyComponent);
    expect(wrapper.text()).not.toContain("Admin Content");
  });
});
```

## Troubleshooting

### Permission directive not working

1. Ensure the plugin is registered
2. Check that permissions are defined in configuration
3. Verify permission values are correct
4. Enable debug logging to see what's happening

### Elements not being removed

Check if:

1. Element has the correct permission value
2. User doesn't actually have the permission
3. Using `:show` modifier (hides instead of removes)
4. Permission checks are complete (await if async)

### Type errors in TypeScript

Ensure your `tsconfig.json` includes Vue type definitions:

```json
{
  "compilerOptions": {
    "types": ["vue", "nuxt"],
    "moduleResolution": "bundler"
  }
}
```

### SSR issues

The library is SSR-safe. If issues occur:

1. Ensure permissions are loaded before render
2. Use proper Nuxt middleware
3. Handle hydration correctly
4. Check console for errors
