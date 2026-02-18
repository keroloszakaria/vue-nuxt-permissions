# v-permission Directive

A Vue directive for conditional rendering based on user permissions.

## Overview

The `v-permission` directive controls element visibility based on permissions. By default, elements without required permissions are removed entirely from the DOM. Use the `:show` modifier to hide elements with CSS instead.

## Syntax

### Basic

```vue
<element v-permission="permission - check">
  Content
</element>
```

### With Modifier

```vue
<!-- Show/hide with display:none -->
<element v-permission:show="permission - check">
  Content
</element>
```

## Permission Check Types

### String

Single permission check:

```vue
<button v-permission="'admin'">Admin Only</button>
```

### Array

Multiple permissions (OR logic):

```vue
<button v-permission="['admin', 'moderator']">
  Admin or Moderator
</button>
```

### Object

Complex permission logic:

```vue
<button v-permission="{ permissions: ['admin', 'verified'], mode: 'and' }">
  Admin and Verified
</button>
```

## Modes

| Mode        | Behavior                                              |
| ----------- | ----------------------------------------------------- |
| `or`        | At least one permission required (default for arrays) |
| `and`       | All permissions required                              |
| `not`       | User must NOT have the permission                     |
| `startWith` | User has permission starting with pattern             |
| `endWith`   | User has permission ending with pattern               |
| `regex`     | User has permission matching regex                    |

### Mode Examples

**OR (Array)**:

```vue
<!-- User needs 'admin' OR 'editor' -->
<div v-permission="['admin', 'editor']">Content</div>
```

**AND**:

```vue
<!-- User needs 'admin' AND 'verified' -->
<div v-permission="{ permissions: ['admin', 'verified'], mode: 'and' }">
  Content
</div>
```

**NOT**:

```vue
<!-- User must NOT have 'guest' -->
<div v-permission="{ permissions: ['guest'], mode: 'not' }">
  Premium Content
</div>
```

**startWith**:

```vue
<!-- User has any permission starting with 'admin' -->
<div v-permission="{ permissions: ['admin'], mode: 'startWith' }">
  Admin Panel
</div>
```

**endWith**:

```vue
<!-- User has any permission ending with 'admin' -->
<div v-permission="{ permissions: ['admin'], mode: 'endWith' }">
  Admin Access
</div>
```

**regex**:

```vue
<!-- User has permission matching regex -->
<div v-permission="{ permissions: ['^user\\.'], mode: 'regex' }">
  User Management
</div>
```

## Modifiers

### `:show`

Hide element with CSS (`display:none`) instead of removing from DOM:

```vue
<button v-permission:show="'admin'">Admin Only</button>
<!-- If no permission: hidden with display:none, not removed -->
```

| Modifier       | Behavior               |
| -------------- | ---------------------- |
| None (default) | Remove from DOM        |
| `:show`        | Hide with display:none |

## Behavior Comparison

| Aspect               | Default                       | `:show`                            |
| -------------------- | ----------------------------- | ---------------------------------- |
| If permission denied | Element removed from DOM      | Element hidden with `display:none` |
| DevTools inspection  | Element not visible           | Element visible in DevTools        |
| Layout impact        | No impact (removed)           | Preserves layout (hidden)          |
| Performance          | Slightly faster (no DOM node) | Slightly slower (DOM node present) |
| Use case             | Sensitive UI                  | Temporary hiding, debugging        |

## Examples

### Basic Permission Check

```vue
<template>
  <div>
    <!-- Only visible if user has 'admin' permission -->
    <button v-permission="'admin'">Delete User</button>

    <!-- Only visible if user has 'editor' OR 'admin' -->
    <button v-permission="['editor', 'admin']">Edit Post</button>
  </div>
</template>
```

### Show vs Remove

```vue
<template>
  <div>
    <!-- Removed from DOM if no 'admin' -->
    <button v-permission="'admin'">Delete (Removed)</button>

    <!-- Hidden with CSS if no 'admin' -->
    <button v-permission:show="'admin'">Delete (Hidden)</button>
  </div>
</template>
```

### Complex Permissions

```vue
<template>
  <div>
    <!-- User needs both permissions -->
    <section v-permission="{ permissions: ['admin', 'verified'], mode: 'and' }">
      Verified Admin Area
    </section>

    <!-- User must NOT have 'guest' permission -->
    <section v-permission="{ permissions: ['guest'], mode: 'not' }">
      Members Only
    </section>

    <!-- User has any permission starting with 'admin' -->
    <nav v-permission="{ permissions: ['admin'], mode: 'startWith' }">
      <AdminMenu />
    </nav>
  </div>
</template>
```

### Conditional Sections

```vue
<template>
  <div class="dashboard">
    <!-- Admin section -->
    <section v-permission="'admin'" class="admin">
      <h2>Admin Panel</h2>
      <AdminTools />
    </section>

    <!-- Editor section -->
    <section v-permission="'editor'" class="editor">
      <h2>Editor Tools</h2>
      <EditorTools />
    </section>

    <!-- Public section (always visible) -->
    <section class="public">
      <h2>Public Content</h2>
    </section>
  </div>
</template>
```

## Dynamic Permissions

Update permissions dynamically, and elements update instantly:

```vue
<template>
  <div>
    <button @click="toggleAdmin">Toggle Admin</button>

    <!-- Updates instantly when permissions change -->
    <div v-permission="'admin'">Admin Content</div>
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { setPermissions, canSync } = usePermission();

const toggleAdmin = () => {
  if (canSync("admin")) {
    setPermissions(["user"]);
  } else {
    setPermissions(["admin", "user"]);
  }
};
</script>
```

## With Form Inputs

```vue
<template>
  <form>
    <!-- Always visible -->
    <div class="field">
      <label>Name</label>
      <input type="text" />
    </div>

    <!-- Only for editors -->
    <div v-permission="'editor'" class="field">
      <label>SEO Title</label>
      <input type="text" />
    </div>

    <!-- Only for admins -->
    <div v-permission="'admin'" class="field">
      <label>Internal Notes</label>
      <textarea></textarea>
    </div>

    <button type="submit">Save</button>
  </form>
</template>
```

## With Nested Elements

The directive applies to the element and its children:

```vue
<template>
  <!-- Entire card is hidden/removed if permission denied -->
  <div v-permission="'admin'" class="admin-card">
    <h3>Admin Card</h3>
    <p>Content</p>
    <button>Action</button>
  </div>
</template>
```

## Error Handling

Invalid permission objects return `false` (access denied):

```ts
// Invalid mode
canSync({ permissions: ["admin"], mode: "invalid" }); // false

// Empty permissions array
canSync({ permissions: [], mode: "and" }); // false

// Invalid regex
canSync({ permissions: ["[invalid"], mode: "regex" }); // false
```

Enable `developmentMode` to see warnings in console.

## Performance Considerations

- The directive evaluates asynchronously but caches results
- Use `:show` modifier if you need the element to remain in DOM
- For frequently toggled permissions, use `canSync()` in templates instead

## Common Patterns

### Navigation with Permissions

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
    </ul>
  </nav>
</template>
```

### Action Buttons

```vue
<template>
  <div class="actions">
    <button v-permission="'edit'">Edit</button>
    <button v-permission="'delete'">Delete</button>
    <button v-permission="'admin'">Admin</button>
  </div>
</template>
```

### Feature Flags

```vue
<template>
  <div>
    <NewFeature v-permission="'feature.beta'" />
    <StableFeature v-permission="'feature.stable'" />
  </div>
</template>
```

## Debugging

Enable `developmentMode` to see logs:

```ts
app.use(PermissionPlugin, {
  permissions: ["admin"],
  developmentMode: true,
});
```

Console output shows directive evaluations and changes.

## Type Definitions

```ts
interface DirectiveBinding {
  value: PermissionValue;
  modifiers: { show?: boolean };
  arg?: string;
}

type PermissionValue =
  | "*"
  | string
  | string[]
  | {
      permissions: string[];
      mode: PermissionMode;
    };

type PermissionMode = "and" | "or" | "not" | "startWith" | "endWith" | "regex";
```
