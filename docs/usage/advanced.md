# Advanced Usage

Complex permission patterns, AND/OR/NOT logic, pattern matching, and async permissions.

## Permission Objects

Beyond simple strings and arrays, use permission objects for complex logic.

### Structure

```ts
{
  permissions: string[],    // Array of permissions to check
  mode: PermissionMode      // How to evaluate: 'and', 'or', 'not', 'startWith', 'endWith', 'regex'
}
```

## Logic Modes

### AND Mode (All Required)

All permissions must be present:

```vue
<template>
  <!-- User must have BOTH 'admin' AND 'verified' -->
  <button v-permission="{ permissions: ['admin', 'verified'], mode: 'and' }">
    Sensitive Action
  </button>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();

// User: ["admin", "verified", "editor"]
await can({ permissions: ["admin", "verified"], mode: "and" }); // true

// User: ["admin", "editor"]
await can({ permissions: ["admin", "verified"], mode: "and" }); // false
</script>
```

### OR Mode (Any Required)

At least one permission must be present (same as array syntax):

```vue
<template>
  <!-- User must have 'admin' OR 'moderator' OR 'editor' -->
  <button
    v-permission="{ permissions: ['admin', 'moderator', 'editor'], mode: 'or' }"
  >
    Manage Content
  </button>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();

// User: ["editor"]
await can({ permissions: ["admin", "moderator", "editor"], mode: "or" }); // true

// User: ["user"]
await can({ permissions: ["admin", "moderator", "editor"], mode: "or" }); // false
</script>
```

### NOT Mode (Negation)

User must NOT have the permission:

```vue
<template>
  <!-- Shows if user does NOT have 'guest' permission -->
  <div v-permission="{ permissions: ['guest'], mode: 'not' }">
    Premium Content
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();

// User: ["admin", "editor"]
await can({ permissions: ["guest"], mode: "not" }); // true (doesn't have 'guest')

// User: ["guest"]
await can({ permissions: ["guest"], mode: "not" }); // false (has 'guest')
</script>
```

Useful for hiding content from specific roles:

```vue
<template>
  <div>
    <!-- Hide trial features from non-paying users -->
    <AdvancedAnalytics
      v-permission="{ permissions: ['unpaid'], mode: 'not' }"
    />
  </div>
</template>
```

## Pattern Matching Modes

### startWith Mode

Check if any user permission starts with the given pattern:

```vue
<template>
  <!-- User has ["admin.users", "admin.posts", "admin.settings"] -->
  <button v-permission="{ permissions: ['admin'], mode: 'startWith' }">
    Admin Panel (any admin permission)
  </button>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();

// User: ["admin.users", "admin.posts"]
await can({ permissions: ["admin"], mode: "startWith" }); // true

// User: ["super.admin", "editor"]
await can({ permissions: ["admin"], mode: "startWith" }); // false
</script>
```

Useful for wildcard permission matching:

```vue
<template>
  <!-- User can access any "posts" feature -->
  <div v-permission="{ permissions: ['posts'], mode: 'startWith' }">
    <PostsManager />
  </div>
</template>
```

### endWith Mode

Check if any user permission ends with the given pattern:

```vue
<template>
  <!-- User has ["super.admin", "site.admin", "app.admin"] -->
  <button v-permission="{ permissions: ['admin'], mode: 'endWith' }">
    Admin Panel (any admin role)
  </button>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();

// User: ["super.admin", "site.admin"]
await can({ permissions: ["admin"], mode: "endWith" }); // true

// User: ["admin.posts", "editor"]
await can({ permissions: ["admin"], mode: "endWith" }); // false
</script>
```

### regex Mode

Use regular expressions for complex matching:

```vue
<template>
  <!-- User permissions: ["user.view", "user.create", "user.edit"] -->
  <button v-permission="{ permissions: ['^user\\.'], mode: 'regex' }">
    User Management
  </button>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();

// User: ["user.view", "user.create"]
await can({ permissions: ["^user\\."], mode: "regex" }); // true (matches "user.*")

// User: ["admin.user", "post.view"]
await can({ permissions: ["^user\\."], mode: "regex" }); // false
</script>
```

More regex examples:

```ts
// Match any permission containing "edit"
{ permissions: ["edit"], mode: "regex" }

// Match permissions ending with "delete"
{ permissions: ["delete$"], mode: "regex" }

// Match multiple patterns
{ permissions: ["^(admin|moderator)\\."], mode: "regex" }

// Match permissions with numbers
{ permissions: ["\\d+"], mode: "regex" }
```

## Combining Complex Permissions

### Multi-Level Access Control

```vue
<template>
  <div>
    <!-- Level 1: Basic access -->
    <section v-permission="'posts.view'">
      <PostsList />
    </section>

    <!-- Level 2: Edit access (requires both view and edit) -->
    <section
      v-permission="{ permissions: ['posts.view', 'posts.edit'], mode: 'and' }"
    >
      <PostEditor />
    </section>

    <!-- Level 3: Admin access (any admin permission) -->
    <section v-permission="{ permissions: ['admin'], mode: 'startWith' }">
      <AdminPanel />
    </section>
  </div>
</template>
```

### Hierarchical Permissions

```vue
<template>
  <div class="content-manager">
    <!-- Public viewer -->
    <div v-if="canSync({ permissions: ['guest'], mode: 'not' })" class="viewer">
      View Content
    </div>

    <!-- Editor+ can create/edit -->
    <div
      v-if="canSync({ permissions: ['editor', 'admin'], mode: 'or' })"
      class="editor"
    >
      <EditTools />
    </div>

    <!-- Admin+ can manage everything -->
    <div
      v-if="canSync({ permissions: ['admin', 'super'], mode: 'or' })"
      class="admin"
    >
      <AdminTools />
    </div>
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
</script>
```

## Async Permission Checking

### With Watch

Monitor permission changes and react:

```vue
<template>
  <div>
    <button v-if="hasDeletePermission">Delete</button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();
const hasDeletePermission = ref(false);

onMounted(async () => {
  // Initial check
  hasDeletePermission.value = await can("post.delete");
});

// Watch for permission updates (if using reactive permissions)
watch(
  () => can("post.delete"),
  async (newVal) => {
    hasDeletePermission.value = await newVal;
  }
);
</script>
```

### With Computed Properties

Derive computed values from permissions:

```vue
<template>
  <div>
    <p>Access Level: {{ accessLevel }}</p>
    <button v-if="canDeleteUsers">Delete Users</button>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();
const permissions = ref({ canEdit: false, canDelete: false });

const accessLevel = computed(() => {
  if (permissions.value.canDelete) return "Admin";
  if (permissions.value.canEdit) return "Editor";
  return "Viewer";
});

const canDeleteUsers = computed(() => permissions.value.canDelete);

onMounted(async () => {
  permissions.value.canEdit = await can("user.edit");
  permissions.value.canDelete = await can("user.delete");
});
</script>
```

## Conditional Routes

### Meta-Based Route Protection

```ts
// router.ts
import { createRouter, createWebHistory } from "vue-router";
import { globalGuard } from "vue-nuxt-permission";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/dashboard",
      component: () => import("./Dashboard.vue"),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: "/admin",
      component: () => import("./Admin.vue"),
      meta: {
        checkPermission: true,
        permissions: "admin",
      },
    },
    {
      path: "/editor",
      component: () => import("./Editor.vue"),
      meta: {
        checkPermission: true,
        permissions: ["admin", "editor"],
      },
    },
    {
      path: "/settings",
      component: () => import("./Settings.vue"),
      meta: {
        checkPermission: true,
        permissions: {
          permissions: ["admin", "settings.manage"],
          mode: "or",
        },
      },
    },
  ],
});

router.beforeEach((to, from, next) => {
  globalGuard(to, from, next, {
    getAuthState: () => ({
      isAuthenticated: !!localStorage.getItem("token"),
      permissions: JSON.parse(localStorage.getItem("permissions") || "[]"),
    }),
    loginPath: "/login",
  });
});

export default router;
```

### Custom Route Guards

```ts
// guard.ts
import { usePermission } from "vue-nuxt-permission";

export const createCustomGuard = () => {
  return async (to, from, next) => {
    const { can } = usePermission();

    // Custom logic
    if (to.path === "/admin" && !(await can("admin"))) {
      next("/");
      return;
    }

    if (to.meta.requiresPermissions) {
      const allowed = await can(to.meta.requiresPermissions);
      if (!allowed) {
        next("/");
        return;
      }
    }

    next();
  };
};

// router.ts
router.beforeEach(createCustomGuard());
```

## Nuxt Middleware

### Middleware-Based Protection

```ts
// middleware/check-admin.ts
import { usePermission } from "vue-nuxt-permission";

export default defineRouteMiddleware(async (to, from) => {
  const { can } = usePermission();

  const isAdmin = await can("admin");
  if (!isAdmin) {
    return navigateTo("/");
  }
});
```

```vue
<!-- pages/admin.vue -->
<template>
  <div>Admin Dashboard</div>
</template>

<script setup>
definePageMeta({
  middleware: "check-admin",
});
</script>
```

### Multiple Middleware

```ts
// middleware/require-auth.ts
import { usePermission } from "vue-nuxt-permission";

export default defineRouteMiddleware(async (to, from) => {
  // Check auth status
  const isAuthenticated = !!localStorage.getItem("token");
  if (!isAuthenticated) {
    return navigateTo("/login");
  }
});
```

```ts
// middleware/require-editor.ts
import { usePermission } from "vue-nuxt-permission";

export default defineRouteMiddleware(async (to, from) => {
  const { can } = usePermission();

  const isEditor = await can({ permissions: ["admin", "editor"], mode: "or" });
  if (!isEditor) {
    return navigateTo("/");
  }
});
```

## Real-World Patterns

### CRUD Operations with Permissions

```vue
<template>
  <div class="crud-panel">
    <!-- Create -->
    <button v-permission="'post.create'" @click="createPost">New Post</button>

    <!-- List with edit/delete -->
    <div v-for="post in posts" :key="post.id" class="post-item">
      <h3>{{ post.title }}</h3>

      <!-- Edit button -->
      <button v-permission="'post.edit'" @click="editPost(post.id)">
        Edit
      </button>

      <!-- Delete button (more restrictive) -->
      <button
        v-permission="{ permissions: ['post.delete', 'admin'], mode: 'or' }"
        @click="deletePost(post.id)"
      >
        Delete
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();
const posts = ref([
  { id: 1, title: "Post 1" },
  { id: 2, title: "Post 2" },
]);

const createPost = async () => {
  if (!(await can("post.create"))) return;
  // Create logic
};

const editPost = async (id) => {
  if (!(await can("post.edit"))) return;
  // Edit logic
};

const deletePost = async (id) => {
  if (!(await can({ permissions: ["post.delete", "admin"], mode: "or" }))) {
    return;
  }
  // Delete logic
};
</script>
```

### Feature-Based UI

```vue
<template>
  <div class="app">
    <!-- Sidebar with feature visibility -->
    <nav class="sidebar">
      <ul>
        <li v-permission="'feature.dashboard'">
          <RouterLink to="/dashboard">Dashboard</RouterLink>
        </li>

        <li
          v-permission="{ permissions: ['feature.posts', 'admin'], mode: 'or' }"
        >
          <RouterLink to="/posts">Posts</RouterLink>
        </li>

        <li v-permission="{ permissions: ['admin'], mode: 'startWith' }">
          <RouterLink to="/admin">Administration</RouterLink>
        </li>

        <li v-permission="{ permissions: ['beta'], mode: 'not' }">
          <RouterLink to="/stable-features">Stable Features</RouterLink>
        </li>
      </ul>
    </nav>

    <!-- Main content -->
    <main>
      <RouterView />
    </main>
  </div>
</template>
```

### Subscription Level Access

```vue
<template>
  <div class="features">
    <section>
      <h2>Free Features</h2>
      <Feature v-permission="'subscription.free'" name="Basic Dashboard" />
    </section>

    <section v-permission="'subscription.pro'">
      <h2>Pro Features</h2>
      <Feature name="Advanced Analytics" />
      <Feature name="Custom Reports" />
    </section>

    <section v-permission="'subscription.enterprise'">
      <h2>Enterprise Features</h2>
      <Feature name="API Access" />
      <Feature name="Custom Integration" />
      <Feature name="Dedicated Support" />
    </section>
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
</script>
```
