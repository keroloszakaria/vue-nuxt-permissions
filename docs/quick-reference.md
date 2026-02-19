# Quick Reference

Copy-paste ready code snippets for common permission patterns.

## Installation

```bash
npm install vue-nuxt-permission
```

## Setup

### Nuxt 3

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],
  permission: {
    permissions: ["admin", "editor", "user"],
  },
});
```

### Vue 3

```ts
// main.ts
import { createApp } from "vue";
import { PermissionPlugin } from "vue-nuxt-permission";

createApp(App)
  .use(PermissionPlugin, {
    permissions: ["admin", "editor", "user"],
  })
  .mount("#app");
```

## v-permission Directive

### Show/Hide Element

Remove from DOM if user lacks permission:

```vue
<button v-permission="'admin'">Delete User</button>
<div v-permission="'editor'">Edit Panel</div>
```

### Keep in DOM (display:none)

```vue
<div v-permission:show="'admin'">Admin Content</div>
<!-- Hidden with display:none, not removed from DOM -->
```

### Multiple Permissions (OR)

```vue
<button v-permission="['admin', 'moderator']">
  Moderate Content
</button>
<!-- Shows if user has 'admin' OR 'moderator' -->
```

### All Permissions Required (AND)

```vue
<button v-permission="{ permissions: ['admin', 'verified'], mode: 'and' }">
  Sensitive Action
</button>
<!-- Shows only if user has BOTH 'admin' AND 'verified' -->
```

### NOT Logic

```vue
<div v-permission="{ permissions: ['guest'], mode: 'not' }">
  This is hidden for guests only
</div>
<!-- Shows if user does NOT have 'guest' permission -->
```

### Pattern Matching

#### Starts With

```vue
<div v-permission="{ permissions: ['admin'], mode: 'startWith' }">
  Shows if any permission starts with 'admin'
</div>
<!-- User: ["admin.users", "admin.posts"] → Shows -->
```

#### Ends With

```vue
<div v-permission="{ permissions: ['admin'], mode: 'endWith' }">
  Shows if any permission ends with 'admin'
</div>
<!-- User: ["super.admin", "site.admin"] → Shows -->
```

#### Regex

```vue
<div v-permission="{ permissions: ['^user\\.\\w+$'], mode: 'regex' }">
  Shows if any permission matches the regex
</div>
<!-- User: ["user.create", "user.view"] → Shows -->
```

## usePermission Composable

### Basic Permission Check

```vue
<script setup>
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();

// Async check
const canDelete = await can("user.delete");
</script>
```

### Synchronous Check

```vue
<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();

// Instant check (no await needed)
const isAdmin = canSync("admin");
</script>

<template>
  <button v-if="isAdmin">Admin Panel</button>
</template>
```

### Check All Permissions

```vue
<script setup>
import { usePermission } from "vue-nuxt-permission";

const { hasAll } = usePermission();

// Check if user has all permissions
const canManagePosts = await hasAll(["posts.create", "posts.delete"]);
</script>
```

### Check Any Permission

```vue
<script setup>
import { usePermission } from "vue-nuxt-permission";

const { hasAny } = usePermission();

// Check if user has at least one permission
const hasEditAccess = await hasAny(["posts.edit", "posts.admin"]);
</script>
```

### Set Permissions

```vue
<script setup>
import { usePermission } from "vue-nuxt-permission";

const { setPermissions } = usePermission();

// Update permissions (e.g., after login)
setPermissions(["user.view", "user.edit"]);
</script>
```

### Refresh Permissions

```vue
<script setup>
import { usePermission } from "vue-nuxt-permission";

const { refresh } = usePermission();

// Clear cache and reload from storage
const refreshPerms = async () => {
  refresh();
};
</script>
```

### Conditional Rendering

```vue
<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
</script>

<template>
  <div v-if="canSync('admin')">Admin Section</div>
  <div v-else-if="canSync('editor')">Editor Section</div>
  <div v-else>Viewer Section</div>
</template>
```

## Router Guards

### Global Permission Guard

```ts
import { createRouter, createWebHistory } from "vue-router";
import { globalGuard } from "vue-nuxt-permission";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: LoginPage },
    {
      path: "/",
      component: Layout,
      meta: { requiresAuth: true },
      children: [
        { path: "dashboard", component: Dashboard },
        {
          path: "admin",
          component: AdminPanel,
          meta: {
            checkPermission: true, // ← Required!
            permissions: "admin",
          },
        },
      ],
    },
  ],
});

router.beforeEach(async (to, from, next) => {
  globalGuard(to, from, next, {
    authRoutes: [{ path: "/login" }],
    getAuthState: () => ({
      isAuthenticated: !!localStorage.getItem("token"),
      permissions: [], // let library read from localStorage
    }),
    loginPath: "/login",
    homePath: "/dashboard",
  });
});
```

::: tip Route Meta Cheatsheet
| Meta Key | Type | Purpose |
|----------|------|---------|
| `requiresAuth` | `boolean` | Redirects to login if not authenticated |
| `checkPermission` | `boolean` | Enables permission checking (must be `true`) |
| `permissions` | `string \| string[] \| PermissionObject` | Required permission(s) |
:::

### Protect Routes with Metadata

```ts
const routes = [
  {
    path: "/dashboard",
    component: Dashboard,
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: "/admin",
    component: AdminPanel,
    meta: {
      checkPermission: true,
      permissions: "admin",
    },
  },
  {
    path: "/editor",
    component: Editor,
    meta: {
      checkPermission: true,
      permissions: ["admin", "editor"],
    },
  },
];
```

### Custom Guard with Fallback

```ts
router.beforeEach(async (to, from, next) => {
  const authState = {
    isAuthenticated: !!localStorage.getItem("token"),
    permissions: JSON.parse(localStorage.getItem("permissions") || "[]"),
  };

  if (to.meta.requiresAuth && !authState.isAuthenticated) {
    return next("/login");
  }

  if (to.meta.checkPermission && to.meta.permissions) {
    const allowed = await hasPermission(
      to.meta.permissions,
      authState.permissions,
    );
    if (!allowed) {
      return next("/"); // Fallback to home
    }
  }

  next();
});
```

## Complex Permission Patterns

### Feature Toggle

```vue
<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();

const hasAdvancedAnalytics = canSync("feature.advancedAnalytics");
</script>

<template>
  <AnalyticsPanel v-if="hasAdvancedAnalytics" />
</template>
```

### Multi-Level Access

```vue
<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();

const accessLevel = {
  view: canSync("posts.view"),
  edit: canSync("posts.edit"),
  delete: canSync("posts.delete"),
};
</script>

<template>
  <div class="post">
    <PostViewer v-if="accessLevel.view" :post="post" />
    <PostEditor v-if="accessLevel.edit" :post="post" />
    <button v-if="accessLevel.delete" @click="deletePost">Delete</button>
  </div>
</template>
```

### Wildcard Matching

```vue
<!-- User has ["user.create", "user.edit", "user.view"] -->

<!-- Matches if any permission starts with 'user' -->
<button v-permission="{ permissions: ['user'], mode: 'startWith' }">
  User Management
</button>

<!-- Matches if any permission ends with 'delete' -->
<button v-permission="{ permissions: ['delete'], mode: 'endWith' }">
  Delete Resource
</button>
```

### Conditional Button State

```vue
<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();

const canEdit = canSync("post.edit");
const canPublish = canSync("post.publish");
</script>

<template>
  <button :disabled="!canEdit">Edit Post</button>
  <button :disabled="!canPublish">Publish</button>
</template>
```

## Permission Management

### Update Permissions After Login

```vue
<script setup>
import { usePermission } from "vue-nuxt-permission";

const { setPermissions } = usePermission();

const handleLogin = async (credentials) => {
  const response = await fetch("/api/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  const { user } = await response.json();

  // Update permissions
  setPermissions(user.permissions);
};
</script>
```

### Clear Permissions on Logout

```vue
<script setup>
import { usePermission } from "vue-nuxt-permission";

const { setPermissions } = usePermission();

const handleLogout = async () => {
  await fetch("/api/logout", { method: "POST" });

  // Clear permissions
  setPermissions([]);
};
</script>
```

### Fetch from API

```ts
import { usePermission } from "vue-nuxt-permission";

const { setPermissions } = usePermission();

// Fetch permissions from server
const perms = await fetch("/api/user/permissions").then((r) => r.json());
setPermissions(perms);
```

## Debugging

### Enable Development Mode

```ts
// main.ts
app.use(PermissionPlugin, {
  permissions: ["admin"],
  developmentMode: true, // Enable detailed logs
});
```

Console logs appear:

```
[v-permission:core] Evaluated permission "admin": ALLOWED
[v-permission:core] Hiding with display:none
```

### Check Current Permissions

```ts
import { getCurrentPermissions } from "vue-nuxt-permission";

const perms = getCurrentPermissions();
console.log("Current permissions:", perms);
```

### Get From Storage

```ts
import { getPermissionsFromStorage } from "vue-nuxt-permission";

const stored = getPermissionsFromStorage();
console.log("Stored permissions:", stored);
```
