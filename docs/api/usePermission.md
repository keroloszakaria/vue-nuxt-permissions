# usePermission Composable

A Vue composable for permission checking in templates and component logic.

## Overview

The `usePermission()` composable provides methods for checking user permissions, updating permissions, and managing permission state reactively.

## Import

```ts
import { usePermission } from "vue-nuxt-permission";
```

## API

### `can(permission)`

Asynchronously check if user has permission.

**Type**:

```ts
can(permission: PermissionValue): Promise<boolean>
```

**Parameters**:

- `permission` - Permission to check (string, array, or object)

**Returns**: Promise resolving to boolean

**Example**:

```ts
const { can } = usePermission();

const hasAccess = await can("admin");
```

### `canSync(permission)`

Synchronously check if user has permission (instant, no await).

**Type**:

```ts
canSync(permission: PermissionValue): boolean
```

**Parameters**:

- `permission` - Permission to check (string, array, or object)

**Returns**: Boolean (immediate)

**Example**:

```ts
const { canSync } = usePermission();

const isAdmin = canSync("admin"); // No await needed
```

### `hasAll(permissions)`

Check if user has all specified permissions (AND logic).

**Type**:

```ts
hasAll(permissions: string[]): Promise<boolean>
```

**Parameters**:

- `permissions` - Array of permissions (all required)

**Returns**: Promise resolving to boolean

**Example**:

```ts
const { hasAll } = usePermission();

const canManage = await hasAll(["admin", "verified"]);
```

### `hasAny(permissions)`

Check if user has any of the specified permissions (OR logic).

**Type**:

```ts
hasAny(permissions: string[]): Promise<boolean>
```

**Parameters**:

- `permissions` - Array of permissions (at least one required)

**Returns**: Promise resolving to boolean

**Example**:

```ts
const { hasAny } = usePermission();

const canEdit = await hasAny(["editor", "admin"]);
```

### `setPermissions(permissions)`

Update user permissions at runtime.

**Type**:

```ts
setPermissions(permissions: string[]): void
```

**Parameters**:

- `permissions` - New permission array

**Returns**: void

**Example**:

```ts
const { setPermissions } = usePermission();

// Update after login
setPermissions(["user.view", "user.edit"]);
```

### `refresh()`

Clear permission cache and reload from current source.

**Type**:

```ts
refresh(): void
```

**Returns**: void

**Example**:

```ts
const { refresh } = usePermission();

// Clear cache and reload
refresh();
```

### `permissions` (Reactive Ref)

Get reactive reference to current permissions array.

**Type**:

```ts
permissions: Ref<string[]>;
```

**Example**:

```ts
const { permissions } = usePermission();

console.log(permissions.value); // ["admin", "editor"]
```

## Usage Patterns

### Basic Permission Checks

```vue
<script setup>
import { usePermission } from "vue-nuxt-permission";

const { can, canSync } = usePermission();

// Async check in logic
const handleDelete = async () => {
  const allowed = await can("post.delete");
  if (!allowed) return;
  // Delete post
};

// Sync check in template
const isAdmin = canSync("admin");
</script>

<template>
  <button v-if="isAdmin" @click="handleDelete">Delete</button>
</template>
```

### Multiple Permission Checks

```vue
<script setup>
import { usePermission } from "vue-nuxt-permission";

const { hasAll, hasAny } = usePermission();

// All permissions required
const canAdminister = await hasAll(["admin", "verified"]);

// At least one permission
const canEdit = await hasAny(["editor", "admin"]);
</script>
```

### Real-Time Updates

```vue
<template>
  <div>
    <p>Permissions: {{ permissions.join(", ") }}</p>
    <button @click="grantAdmin">Grant Admin</button>
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { permissions, setPermissions } = usePermission();

const grantAdmin = () => {
  const newPerms = [...permissions.value, "admin"];
  setPermissions(newPerms);
};
</script>
```

### Conditional Rendering

```vue
<template>
  <div class="dashboard">
    <!-- Admin section -->
    <div v-if="canSync('admin')">
      <AdminPanel />
    </div>

    <!-- Editor section -->
    <div v-else-if="canSync('editor')">
      <EditorPanel />
    </div>

    <!-- Default -->
    <div v-else>
      <ViewerPanel />
    </div>
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
</script>
```

### Permission State Tracking

```vue
<template>
  <div>
    <button :disabled="!hasDelete">Delete</button>
    <button :disabled="!hasEdit">Edit</button>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();

const state = reactive({
  hasEdit: false,
  hasDelete: false,
});

onMounted(async () => {
  state.hasEdit = await can("post.edit");
  state.hasDelete = await can("post.delete");
});
</script>
```

### Integration with Forms

```vue
<template>
  <form @submit.prevent="submit">
    <input v-model="form.name" placeholder="Name" />

    <div v-if="canSync('feature.seo')">
      <input v-model="form.seoTitle" placeholder="SEO Title" />
    </div>

    <div v-if="canSync('admin')">
      <textarea v-model="form.adminNotes" placeholder="Admin Notes"></textarea>
    </div>

    <button type="submit">Save</button>
  </form>
</template>

<script setup>
import { reactive } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { can, canSync } = usePermission();

const form = reactive({
  name: "",
  seoTitle: "",
  adminNotes: "",
});

const submit = async () => {
  const allowed = await can("form.submit");
  if (!allowed) {
    alert("You don't have permission to submit");
    return;
  }
  // Submit logic
};
</script>
```

### Async Initialization

```vue
<template>
  <div>
    <div v-if="loaded">
      <button v-if="canDelete">Delete</button>
    </div>
    <div v-else>Loading permissions...</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { can } = usePermission();
const loaded = ref(false);
const canDelete = ref(false);

onMounted(async () => {
  canDelete.value = await can("delete");
  loaded.value = true;
});
</script>
```

## Type Definitions

```ts
interface UsePermissionReturn {
  permissions: Ref<string[]>;
  can: (permission: PermissionValue) => Promise<boolean>;
  canSync: (permission: PermissionValue) => boolean;
  hasAll: (permissions: string[]) => Promise<boolean>;
  hasAny: (permissions: string[]) => Promise<boolean>;
  setPermissions: (permissions: string[]) => void;
  refresh: () => void;
}

type PermissionValue =
  | "*"
  | string
  | string[]
  | {
      permissions: string[];
      mode: PermissionMode;
    };
```

## Performance Tips

1. **Use `canSync()` in templates** - No async overhead
2. **Use `can()` in logic** - For async operations
3. **Cache results** - Store permission checks in reactive variables
4. **Use pattern matching** - For large permission sets with `startWith`, `endWith`, `regex`

## Common Mistakes

### ❌ Forgetting to await `can()`

```ts
// Wrong
const allowed = can("admin");
if (allowed) {
} // This is always true (it's a Promise)

// Correct
const allowed = await can("admin");
if (allowed) {
}
```

### ❌ Using `can()` in synchronous context

```ts
// Wrong - async in sync context
const isAdmin = canSync(can("admin")); // Error

// Correct
const isAdmin = canSync("admin"); // Instant
const isAdmin2 = await can("admin"); // Async
```

### ❌ Mutating permissions without setter

```ts
// Wrong - mutations don't trigger reactivity
const { permissions } = usePermission();
permissions.value.push("newperm");

// Correct - use setter
const { setPermissions } = usePermission();
setPermissions([...permissions.value, "newperm"]);
```

## Best Practices

1. **Use composable in setup** - Always call in script setup or composable
2. **Check permissions before actions** - Verify before API calls
3. **Combine with directive** - Use both for comprehensive coverage
4. **Cache expensive checks** - Store results in reactive variables
5. **Handle async properly** - Always await async operations
