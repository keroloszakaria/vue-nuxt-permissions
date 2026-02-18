# Basic Usage

Simple permission checks with v-permission directive and composables.

## Installation & Setup

### Nuxt 3

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],
  permission: {
    permissions: ["user.view", "user.edit", "user.delete", "admin"],
  },
});
```

### Vue 3

```ts
// main.ts
import { createApp } from "vue";
import { PermissionPlugin } from "vue-nuxt-permission";
import App from "./App.vue";

const app = createApp(App);

app.use(PermissionPlugin, {
  permissions: ["user.view", "user.edit", "user.delete", "admin"],
});

app.mount("#app");
```

## v-permission Directive

The `v-permission` directive controls element visibility based on permissions. By default, elements without the required permission are removed from the DOM.

### Single Permission Check

Show an element only if the user has a specific permission:

```vue
<template>
  <div>
    <button v-permission="'user.edit'">Edit User</button>
    <button v-permission="'user.delete'">Delete User</button>
    <button v-permission="'admin'">Admin Panel</button>
  </div>
</template>
```

If the user has `["user.view", "user.edit"]` permissions, only the "Edit User" button appears. The others are removed from the DOM.

### Show Instead of Remove

Use the `:show` modifier to hide elements with CSS instead of removing them from the DOM:

```vue
<template>
  <div>
    <!-- Removed from DOM if no permission -->
    <button v-permission="'admin'">Delete (Remove)</button>

    <!-- Hidden with display:none if no permission -->
    <button v-permission:show="'admin'">Delete (Hide)</button>
  </div>
</template>
```

The `:show` modifier is useful for:

- Preserving layout and spacing
- Debugging (inspect element in DevTools)
- Testing (element still exists in DOM)
- Temporary visibility toggles

### Multiple Permissions (OR Logic)

Show an element if the user has any of the listed permissions:

```vue
<template>
  <div>
    <!-- Shows if user has 'user.edit' OR 'user.create' -->
    <button v-permission="['user.edit', 'user.create']">Manage Users</button>

    <!-- Shows if user has 'editor' OR 'admin' -->
    <section v-permission="['editor', 'admin']">
      Content Management Tools
    </section>
  </div>
</template>
```

If the user has any permission in the array, the element is shown. If they have none, it's removed or hidden.

## usePermission Composable

The `usePermission()` composable provides methods for permission checking in JavaScript/TypeScript.

### Synchronous Checks in Templates

Use `canSync()` for instant permission checks in templates:

```vue
<template>
  <div>
    <button v-if="canSync('user.delete')">Delete</button>
    <button v-if="canSync('user.edit')">Edit</button>
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
</script>
```

`canSync()` returns immediately without any async overhead, making it ideal for template conditions.

### Asynchronous Checks in Logic

Use `can()` for permission checks in component logic:

```vue
<template>
  <div>
    <button @click="deleteUser" :disabled="!permissions.canDelete">
      Delete User
    </button>
  </div>
</template>

<script setup>
import { reactive } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();

const permissions = reactive({
  canDelete: false,
  canEdit: false,
});

onMounted(async () => {
  permissions.canDelete = await can("user.delete");
  permissions.canEdit = await can("user.edit");
});

const deleteUser = async () => {
  const allowed = await can("user.delete");
  if (!allowed) {
    console.error("Permission denied");
    return;
  }
  // Delete user logic
};
</script>
```

### Conditional Rendering

Render different content based on permission levels:

```vue
<template>
  <div class="dashboard">
    <section v-if="canSync('admin')">
      <h2>Admin Dashboard</h2>
      <AdminPanel />
    </section>

    <section v-else-if="canSync('editor')">
      <h2>Editor Dashboard</h2>
      <EditorPanel />
    </section>

    <section v-else>
      <h2>Reader Dashboard</h2>
      <ReaderPanel />
    </section>
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
</script>
```

## Common Patterns

### Button State Based on Permission

```vue
<template>
  <button :disabled="!canSync('post.delete')" @click="deletePost">
    {{ canSync("post.delete") ? "Delete Post" : "No Permission" }}
  </button>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();

const deletePost = async () => {
  const allowed = await can("post.delete");
  if (!allowed) return;
  // Delete logic
};
</script>
```

### Navigation Menu with Permissions

```vue
<template>
  <nav>
    <ul>
      <li><RouterLink to="/">Home</RouterLink></li>

      <li v-permission="'posts.view'">
        <RouterLink to="/posts">Posts</RouterLink>
      </li>

      <li v-permission="'admin'">
        <RouterLink to="/admin">Admin</RouterLink>
      </li>

      <li v-permission="'settings.edit'">
        <RouterLink to="/settings">Settings</RouterLink>
      </li>
    </ul>
  </nav>
</template>
```

### Form with Permission-Gated Sections

```vue
<template>
  <form @submit.prevent="submitForm">
    <!-- Always visible -->
    <div class="field">
      <label>Name</label>
      <input v-model="form.name" />
    </div>

    <!-- Only for editors or admins -->
    <div v-permission="['editor', 'admin']" class="field">
      <label>SEO Title</label>
      <input v-model="form.seoTitle" />
    </div>

    <!-- Only for admins -->
    <div v-permission="'admin'" class="field">
      <label>Admin Notes</label>
      <textarea v-model="form.adminNotes"></textarea>
    </div>

    <!-- Submit button with conditional text -->
    <button type="submit">
      {{ canSync("form.submit") ? "Submit" : "Review Only" }}
    </button>
  </form>
</template>

<script setup>
import { reactive } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();

const form = reactive({
  name: "",
  seoTitle: "",
  adminNotes: "",
});

const submitForm = async () => {
  const allowed = await can("form.submit");
  if (!allowed) {
    console.error("Not allowed to submit");
    return;
  }
  // Submit logic
};
</script>
```

### Feature Toggles

```vue
<template>
  <div>
    <!-- New dashboard feature -->
    <DashboardV2 v-if="canSync('feature.newDashboard')" />
    <DashboardV1 v-else />

    <!-- Beta analytics -->
    <BetaAnalytics v-if="canSync('beta.analytics')" />
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
</script>
```

## Permission Checks in Event Handlers

```vue
<template>
  <div class="post">
    <h2>{{ post.title }}</h2>
    <p>{{ post.content }}</p>

    <div class="actions">
      <button @click="handleEdit">Edit</button>
      <button @click="handleDelete">Delete</button>
      <button @click="handlePublish">Publish</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();

const post = ref({
  id: 1,
  title: "My Post",
  content: "Content here...",
});

const handleEdit = async () => {
  if (!(await can("post.edit"))) {
    alert("You don't have permission to edit posts");
    return;
  }
  // Edit logic
  console.log("Editing post...");
};

const handleDelete = async () => {
  if (!(await can("post.delete"))) {
    alert("You don't have permission to delete posts");
    return;
  }
  // Delete logic
  console.log("Deleting post...");
};

const handlePublish = async () => {
  if (!(await can("post.publish"))) {
    alert("You don't have permission to publish posts");
    return;
  }
  // Publish logic
  console.log("Publishing post...");
};
</script>
```

## Real-Time Permission Updates

Update permissions after user login:

```vue
<template>
  <div>
    <button v-if="!isLoggedIn" @click="login">Login</button>

    <div v-else>
      <p>Welcome! You have {{ permissions.length }} permissions.</p>

      <!-- These update reactively when permissions change -->
      <button v-permission="'admin'">Admin Panel</button>
      <button v-permission="'editor'">Edit Content</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { usePermission } from "vue-nuxt-permission";

const isLoggedIn = ref(false);
const { setPermissions } = usePermission();

const permissions = ref([]);

const login = async () => {
  // Fetch user data from API
  const response = await fetch("/api/login", {
    method: "POST",
    body: JSON.stringify({ email: "user@example.com", password: "..." }),
  });

  const { user } = await response.json();

  // Update permissions
  setPermissions(user.permissions);
  permissions.value = user.permissions;
  isLoggedIn.value = true;
};

const logout = () => {
  // Clear permissions
  setPermissions([]);
  permissions.value = [];
  isLoggedIn.value = false;
};
</script>
```

## Debugging Permissions

Enable development mode to see detailed logs:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vue-nuxt-permission"],
  permission: {
    permissions: ["admin", "editor"],
    developmentMode: process.env.NODE_ENV === "development",
  },
});
```

Console output:

```
[v-permission:core] Evaluated permission "admin": ALLOWED
[v-permission:core] Evaluated permission "guest": DENIED
[v-permission:core] Hiding with display:none
```

Check current permissions:

```ts
import { getCurrentPermissions } from "vue-nuxt-permission";

const perms = getCurrentPermissions();
console.log("Current permissions:", perms);
```
