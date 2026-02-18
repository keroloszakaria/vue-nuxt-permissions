# Best Practices

Proven patterns and recommendations for implementing permissions in production applications.

## Permission Design

### Use Hierarchical Naming

Organize permissions with a clear hierarchy using dots:

```ts
// ✅ Good: Clear hierarchy
const permissions = [
  "users.view",
  "users.create",
  "users.edit",
  "users.delete",
  "posts.view",
  "posts.create",
  "posts.edit",
  "posts.delete",
  "admin.settings",
  "admin.users",
];

// ❌ Avoid: Unclear naming
const permissions = ["view", "create", "edit", "delete", "admin"];
```

### Define Permissions Explicitly

Document all possible permissions in your application:

```ts
// permissions.ts
export const PERMISSIONS = {
  // User management
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",

  // Post management
  POSTS_VIEW: "posts.view",
  POSTS_CREATE: "posts.create",
  POSTS_EDIT: "posts.edit",
  POSTS_DELETE: "posts.delete",

  // Admin
  ADMIN_SETTINGS: "admin.settings",
  ADMIN_USERS: "admin.users",
} as const;

// Use in code
if (await can(PERMISSIONS.USERS_DELETE)) {
  // Delete user
}
```

### Map Roles to Permissions

Create a clear mapping of roles to permissions:

```ts
// roles.ts
export const ROLE_PERMISSIONS = {
  admin: [
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
    "posts.view",
    "posts.create",
    "posts.edit",
    "posts.delete",
    "admin.settings",
    "admin.users",
  ],
  editor: ["posts.view", "posts.create", "posts.edit"],
  moderator: ["posts.view", "posts.edit", "comments.moderate"],
  user: ["posts.view"],
};

// Load permissions based on user role
const userRole = await fetchUserRole();
const permissions = ROLE_PERMISSIONS[userRole] || [];
```

## Implementation Patterns

### Server-Side Validation

Always validate permissions on the server, not just the client:

```ts
// ✅ Good: Server validates permissions
// server/api/post.delete.ts
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);

  if (!user.permissions.includes("posts.delete")) {
    throw createError({
      statusCode: 403,
      message: "Forbidden",
    });
  }

  const postId = getQuery(event).id;
  await deletePost(postId);
  return { success: true };
});

// ❌ Avoid: Only client-side validation
// This can be bypassed!
const handleDelete = async (postId) => {
  if (!canSync("posts.delete")) {
    return; // User can still call API directly
  }
  await fetch(`/api/post/${postId}`, { method: "DELETE" });
};
```

### Layer Permission Checks

Check permissions at multiple layers:

```ts
// Layer 1: Route level
{
  path: "/admin",
  meta: {
    checkPermission: true,
    permissions: "admin",
  },
}

// Layer 2: Component level
const { canSync } = usePermission();
if (!canSync("admin")) {
  throw new Error("Forbidden");
}

// Layer 3: API level
const response = await fetch("/api/admin/data");
if (response.status === 403) {
  // Handle permission error
}
```

### Cache Permissions Intelligently

Cache permissions but invalidate when needed:

```ts
// Fetch and cache permissions
const { setPermissions } = usePermission();

const initPermissions = async () => {
  const response = await fetch("/api/user/permissions");
  const { permissions } = await response.json();
  setPermissions(permissions);
};

// Refresh permissions when user logs in
const handleLogin = async () => {
  await initPermissions(); // Fetches fresh permissions
};

// Don't refresh too frequently
let lastRefreshTime = Date.now();
const refreshIfNeeded = async () => {
  if (Date.now() - lastRefreshTime < 60000) {
    return; // Refreshed less than 1 minute ago
  }
  await initPermissions();
  lastRefreshTime = Date.now();
};
```

## UI/UX Patterns

### Progressive Disclosure

Show or hide UI elements based on user role:

```vue
<template>
  <div class="dashboard">
    <!-- Basic content for everyone -->
    <BasicDashboard />

    <!-- Extended content for editors -->
    <EditorTools v-if="canSync(['editor', 'admin'])" />

    <!-- Admin-only content -->
    <AdminPanel v-if="canSync('admin')" />
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
</script>
```

### Disabled States

Show disabled buttons for denied permissions:

```vue
<template>
  <div class="actions">
    <!-- Enabled for users with permission -->
    <button :disabled="!canSync('post.edit')" @click="editPost">Edit</button>

    <!-- Show tooltip on hover -->
    <button
      v-permission:show="'post.delete'"
      :disabled="!canSync('post.delete')"
      :title="canSync('post.delete') ? '' : 'You lack permission to delete'"
      @click="deletePost"
    >
      Delete
    </button>
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
</script>
```

### Loading States

Handle async permission checks gracefully:

```vue
<template>
  <div>
    <!-- Show skeleton while loading -->
    <div v-if="loading" class="skeleton">
      <div class="skeleton-button"></div>
    </div>

    <!-- Show real content once loaded -->
    <button v-else :disabled="!canDelete" @click="deletePost">Delete</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();
const loading = ref(true);
const canDelete = ref(false);

onMounted(async () => {
  canDelete.value = await can("post.delete");
  loading.value = false;
});
</script>
```

## Security Best Practices

### Never Trust Client-Side Permissions Alone

```ts
// ❌ Bad: Only checking on client
const handleDelete = async () => {
  if (canSync("admin")) {
    // User can bypass this by modifying localStorage
    await fetch("/api/admin/data", { method: "DELETE" });
  }
};

// ✅ Good: Server validates too
const handleDelete = async () => {
  if (!canSync("admin")) {
    return; // Quick client-side check
  }

  const response = await fetch("/api/admin/data", { method: "DELETE" });
  if (!response.ok) {
    console.error("Server rejected request");
  }
};
```

### Validate Permission Objects

Ensure permission objects are valid:

```ts
// ✅ Good: Define permissions as constants
const PERMISSIONS = {
  ADMIN: "admin",
  EDITOR: "editor",
} as const;

const allowed = await can(PERMISSIONS.ADMIN);

// ❌ Avoid: User-provided permission strings
const userInput = getUserInput(); // Could be anything
const allowed = await can(userInput); // Unsafe
```

### Clear Permissions on Logout

Always clear permissions when user logs out:

```ts
const logout = async () => {
  const { setPermissions } = usePermission();

  // Clear permissions
  setPermissions([]);

  // Clear storage
  localStorage.removeItem("token");
  localStorage.removeItem("permissions");

  // Redirect to login
  router.push("/login");
};
```

### Refresh Permissions Periodically

Refresh user permissions periodically to catch changes:

```ts
// Refresh every 15 minutes
setInterval(async () => {
  const response = await fetch("/api/user/permissions");
  const { permissions } = await response.json();
  setPermissions(permissions);
}, 15 * 60 * 1000);
```

## Testing Permissions

### Test Multiple Permission States

```ts
describe("Permission-Based UI", () => {
  it("shows admin content for admin users", () => {
    const wrapper = mount(Dashboard, {
      global: {
        provide: {
          __v_permission_cache__: ["admin"],
        },
      },
    });

    expect(wrapper.find(".admin-panel").exists()).toBe(true);
  });

  it("hides admin content for regular users", () => {
    const wrapper = mount(Dashboard, {
      global: {
        provide: {
          __v_permission_cache__: ["user"],
        },
      },
    });

    expect(wrapper.find(".admin-panel").exists()).toBe(false);
  });
});
```

### Mock Permission Checks

```ts
import { vi } from "vitest";
import { usePermission } from "vue-nuxt-permission";

vi.mock("vue-nuxt-permission", () => ({
  usePermission: () => ({
    canSync: (perm) => {
      const mockPerms = ["admin", "editor"];
      return mockPerms.includes(perm);
    },
  }),
}));
```

## Performance Optimization

### Use Pattern Matching for Large Sets

```ts
// ❌ Inefficient: Check each permission individually
const canManageUsers = await hasAny([
  "admin.users.view",
  "admin.users.create",
  "admin.users.edit",
  "admin.users.delete",
  "admin.users.manage",
]);

// ✅ Better: Use pattern matching
const canManageUsers = await hasPermission({
  permissions: ["admin.users"],
  mode: "startWith",
});
```

### Memoize Permission Checks

```ts
const memoizedPermissionCheck = (() => {
  const cache = new Map();

  return async (perm) => {
    if (cache.has(perm)) {
      return cache.get(perm);
    }

    const result = await can(perm);
    cache.set(perm, result);
    return result;
  };
})();
```

## Error Handling

### Handle Permission Errors Gracefully

```ts
const handleProtectedAction = async () => {
  try {
    const allowed = await can("sensitive.action");
    if (!allowed) {
      throw new Error("Insufficient permissions");
    }

    await performAction();
  } catch (error) {
    if (error.message === "Insufficient permissions") {
      showNotification({
        type: "error",
        message: "You don't have permission to perform this action",
      });
    } else {
      showNotification({
        type: "error",
        message: "An error occurred",
      });
    }
  }
};
```

### Log Permission Denials

```ts
import { createPermissionGuard } from "vue-nuxt-permission";

router.beforeEach((to, from, next) => {
  createPermissionGuard({
    getAuthState: () => getAuthState(),
    onDenied: (to, from) => {
      logEvent({
        type: "permission_denied",
        path: to.path,
        user: getCurrentUser().id,
        timestamp: new Date(),
      });
    },
  })(to, from, next);
});
```

## Common Anti-Patterns to Avoid

### ❌ Hardcoding Permission Strings

```ts
// Bad: Scattered permission strings
if (user.permissions.includes("admin")) {
  // Show something
}

// Good: Centralized constant
const ADMIN_PERM = "admin";
if (user.permissions.includes(ADMIN_PERM)) {
  // Show something
}
```

### ❌ Checking Permissions Only Client-Side

```ts
// Bad: No server validation
if (canSync("delete")) {
  fetch("/api/delete"); // Server should also validate
}

// Good: Both client and server validate
if (canSync("delete")) {
  const response = await fetch("/api/delete");
  if (response.status === 403) {
    // Server rejected it
  }
}
```

### ❌ Not Handling Async Properly

```ts
// Bad: Forgetting to await
const allowed = can("admin"); // Returns Promise
if (allowed) {
} // Always true

// Good: Properly awaiting
const allowed = await can("admin");
if (allowed) {
}
```

### ❌ Mutating Permissions Directly

```ts
// Bad: Direct mutation
const { permissions } = usePermission();
permissions.value.push("new_perm"); // Doesn't trigger reactivity properly

// Good: Using setter
const { setPermissions } = usePermission();
setPermissions([...permissions.value, "new_perm"]);
```
