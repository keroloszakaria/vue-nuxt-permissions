# hasPermission Function

Core permission evaluation function for programmatic permission checks.

## Overview

The `hasPermission()` function evaluates whether a user has required permissions. It supports multiple evaluation modes and implements caching for performance.

## Import

```ts
import { hasPermission } from "vue-nuxt-permission";
```

## Syntax

```ts
const allowed = await hasPermission(
  permissionValue: PermissionValue,
  userPermissions?: string[]
): Promise<boolean>
```

## Parameters

### `permissionValue`

The permission or permission rule to evaluate.

**Type**:

```ts
type PermissionValue =
  | "*"
  | string
  | string[]
  | {
      permissions: string[];
      mode: PermissionMode;
    };
```

**Modes**:

- `"*"` - Universal access (always true)
- `string` - Single permission check
- `string[]` - Multiple permissions (OR logic)
- `object` - Complex rule with mode

### `userPermissions` (optional)

User's permission array. If omitted, uses globally configured permissions.

**Type**: `string[]`

**Default**: Current global permissions

## Return Value

Promise resolving to boolean indicating whether permission is granted.

## Examples

### String Permission

```ts
const allowed = await hasPermission("admin");
// true if user has "admin" permission
```

### Multiple Permissions (OR)

```ts
const allowed = await hasPermission(["admin", "editor"]);
// true if user has "admin" OR "editor"
```

### Complex Permission Object

```ts
const allowed = await hasPermission({
  permissions: ["admin", "verified"],
  mode: "and",
});
// true if user has BOTH "admin" AND "verified"
```

### Universal Access

```ts
const allowed = await hasPermission("*");
// Always true
```

### With User Permissions

```ts
const allowed = await hasPermission("admin", ["user", "editor"]);
// false (user doesn't have "admin")
```

## Permission Modes

### AND Mode

User must have all permissions:

```ts
const allowed = await hasPermission({
  permissions: ["admin", "verified"],
  mode: "and",
});

// User: ["admin", "verified", "editor"]
// Result: true

// User: ["admin", "editor"]
// Result: false (missing "verified")
```

### OR Mode

User must have at least one permission:

```ts
const allowed = await hasPermission({
  permissions: ["admin", "moderator"],
  mode: "or",
});

// User: ["moderator", "editor"]
// Result: true

// User: ["editor"]
// Result: false
```

### NOT Mode

User must NOT have the permission:

```ts
const allowed = await hasPermission({
  permissions: ["guest"],
  mode: "not",
});

// User: ["admin", "editor"]
// Result: true (doesn't have "guest")

// User: ["guest"]
// Result: false (has "guest")
```

### startWith Mode

User has permission starting with pattern:

```ts
const allowed = await hasPermission({
  permissions: ["admin"],
  mode: "startWith",
});

// User: ["admin.users", "admin.posts"]
// Result: true (matches "admin.*")

// User: ["super.admin"]
// Result: false
```

### endWith Mode

User has permission ending with pattern:

```ts
const allowed = await hasPermission({
  permissions: ["admin"],
  mode: "endWith",
});

// User: ["super.admin", "site.admin"]
// Result: true (matches "*.admin")

// User: ["admin.posts"]
// Result: false
```

### regex Mode

User has permission matching regex pattern:

```ts
const allowed = await hasPermission({
  permissions: ["^user\\."],
  mode: "regex",
});

// User: ["user.view", "user.create"]
// Result: true (matches pattern)

// User: ["admin.view"]
// Result: false
```

## Usage Examples

### In Event Handlers

```ts
const handleDelete = async () => {
  const allowed = await hasPermission("post.delete");
  if (!allowed) {
    alert("You don't have permission to delete posts");
    return;
  }
  // Delete post
};
```

### In Composables

```ts
export const usePostActions = () => {
  const canDelete = async () => {
    return await hasPermission("post.delete");
  };

  const canEdit = async () => {
    return await hasPermission("post.edit");
  };

  return { canDelete, canEdit };
};
```

### In Route Guards

```ts
router.beforeEach(async (to, from, next) => {
  if (to.meta.permissions) {
    const allowed = await hasPermission(to.meta.permissions);
    if (!allowed) {
      return next("/forbidden");
    }
  }
  next();
});
```

### In API Middleware

```ts
export const protectedAPI = async (endpoint, permission) => {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    throw new Error("Insufficient permissions");
  }

  const response = await fetch(endpoint);
  return response.json();
};
```

### Complex Conditionals

```ts
const canManageUsers = await hasPermission({
  permissions: ["admin", "user.manage"],
  mode: "or",
});

const canDeleteAnywhere = await hasPermission({
  permissions: ["delete"],
  mode: "startWith",
});

const isPremium = await hasPermission({
  permissions: ["subscription.free"],
  mode: "not",
});
```

## Synchronous Alternative

For synchronous permission checks, use the lower-level function:

```ts
import { checkPermissionSync } from "vue-nuxt-permission";

const allowed = checkPermissionSync("admin");
// Instant, no await needed
```

However, prefer using the `usePermission()` composable in Vue components.

## Caching

The function automatically caches results for performance:

```ts
// First call evaluates
const result1 = await hasPermission("admin");

// Subsequent calls return cached result
const result2 = await hasPermission("admin");
```

Cache is cleared automatically when:

- Permissions are updated via `setPermissions()`
- `clearPermissionCache()` is called
- `refresh()` is called

## Error Handling

Invalid permission objects return `false`:

```ts
// Invalid mode
await hasPermission({
  permissions: ["admin"],
  mode: "invalid",
}); // false

// Empty permissions array
await hasPermission({
  permissions: [],
  mode: "and",
}); // false

// Invalid regex
await hasPermission({
  permissions: ["[invalid"],
  mode: "regex",
}); // false
```

Enable `developmentMode` to see warnings.

## Type Definitions

```ts
function hasPermission(
  permissionValue: PermissionValue,
  userPermissions?: string[]
): Promise<boolean>;

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

## Performance Considerations

1. **Results are cached** - Repeated checks are instant
2. **Async evaluation** - Non-blocking I/O
3. **Pattern matching** - Use for large permission sets
4. **Validate regex** - Invalid patterns handled gracefully

## Common Patterns

### Multi-Level Access Control

```ts
const viewAccess = await hasPermission("posts.view");
const editAccess = await hasPermission("posts.edit");
const deleteAccess = await hasPermission("posts.delete");
const adminAccess = await hasPermission("admin");

const accessLevel = adminAccess ? "admin" : editAccess ? "editor" : "viewer";
```

### Feature Gating

```ts
const hasNewUI = await hasPermission("feature.newUI");
const hasExperimentalAPI = await hasPermission("beta.api");
```

### Subscription Levels

```ts
const isPro = await hasPermission("subscription.pro");
const isEnterprise = await hasPermission("subscription.enterprise");
```
