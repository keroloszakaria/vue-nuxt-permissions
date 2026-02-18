# Common Mistakes and How to Avoid Them

Learn from common permission implementation pitfalls and how to prevent them.

## Reactivity Issues

### Problem: Permissions Don't Update in UI

Updating permissions with a static array doesn't trigger reactivity:

```ts
// ❌ Wrong: Doesn't trigger UI updates
const perms = ["admin"];
app.use(PermissionPlugin, { permissions: perms });
perms[0] = "editor"; // UI won't update
```

**Solution**: Use reactive references or the setter:

```ts
// ✅ Correct: Using ref
import { ref } from "vue";

const perms = ref(["admin"]);
app.use(PermissionPlugin, { permissions: perms });
perms.value[0] = "editor"; // Updates reactively

// OR use setter
const { setPermissions } = usePermission();
setPermissions(["editor"]); // Updates reactively
```

### Problem: Direct Array Mutations

```ts
// ❌ Wrong: Direct mutation
const { permissions } = usePermission();
permissions.value.push("newperm"); // May not trigger updates

// ✅ Correct: Use setter
const { setPermissions } = usePermission();
const { permissions } = usePermission();
setPermissions([...permissions.value, "newperm"]);
```

## Async/Await Issues

### Problem: Forgetting to Await Async Permission Checks

```ts
// ❌ Wrong: Treating Promise as boolean
const allowed = can("admin");
if (allowed) {
} // Always true (it's a Promise!)

// ✅ Correct: Use await
const allowed = await can("admin");
if (allowed) {
}

// ✅ Or use sync version
const allowed = canSync("admin");
if (allowed) {
}
```

### Problem: Using Async in Sync Context

```ts
// ❌ Wrong: Can't await in sync method
const isAllowed = canSync(can("admin")); // Error

// ✅ Correct: Pick the right method
const isAllowed = canSync("admin"); // Instant
const isAllowed2 = await can("admin"); // Async
```

### Problem: Not Handling Async Loading States

```vue
<!-- ❌ Wrong: No loading state -->
<template>
  <button v-if="canDelete" @click="delete">Delete</button>
</template>

<script setup>
const { can } = usePermission();
const canDelete = await can("delete"); // Might not be ready
</script>

<!-- ✅ Correct: Show loading state -->
<template>
  <button v-if="loaded && canDelete" @click="delete">Delete</button>
  <span v-else>Loading...</span>
</template>

<script setup>
import { ref, onMounted } from "vue";
const { can } = usePermission();
const loaded = ref(false);
const canDelete = ref(false);

onMounted(async () => {
  canDelete.value = await can("delete");
  loaded.value = true;
});
</script>
```

## Security Mistakes

### Problem: Only Checking Permissions Client-Side

```ts
// ❌ Wrong: No server validation
const handleDelete = async () => {
  if (canSync("admin")) {
    // User can spoof this
    await fetch("/api/delete", { method: "DELETE" });
  }
};

// ✅ Correct: Server validates too
const handleDelete = async () => {
  if (!canSync("admin")) {
    return; // Quick client check
  }

  const response = await fetch("/api/delete", { method: "DELETE" });
  if (response.status === 403) {
    console.error("Server rejected request");
    return;
  }
  // Proceed with success
};
```

### Problem: Not Clearing Permissions on Logout

```ts
// ❌ Wrong: Permissions remain after logout
const logout = async () => {
  localStorage.removeItem("token");
  router.push("/login");
  // Permissions still in memory!
};

// ✅ Correct: Explicitly clear
const logout = async () => {
  const { setPermissions } = usePermission();
  setPermissions([]); // Clear permissions
  localStorage.removeItem("token");
  router.push("/login");
};
```

### Problem: Trusting User-Provided Permission Strings

```ts
// ❌ Wrong: Using unsanitized input
const userInput = req.body.permission;
const allowed = await can(userInput); // Unsafe!

// ✅ Correct: Validate against known permissions
const VALID_PERMISSIONS = ["admin", "editor", "user"];
if (!VALID_PERMISSIONS.includes(userInput)) {
  throw new Error("Invalid permission");
}
const allowed = await can(userInput);
```

## Configuration Mistakes

### Problem: Not Configuring Development Mode During Development

```ts
// ❌ Wrong: Can't debug permission issues
app.use(PermissionPlugin, {
  permissions: ["admin"],
  // developmentMode not set
});

// ✅ Correct: Enable for development
app.use(PermissionPlugin, {
  permissions: ["admin"],
  developmentMode: process.env.NODE_ENV === "development",
});
```

### Problem: Hardcoded Permissions Instead of Dynamic

```ts
// ❌ Wrong: Hardcoded, won't update
app.use(PermissionPlugin, {
  permissions: ["admin"],
});

// ✅ Correct: Dynamic from API
app.use(PermissionPlugin, {
  fetchPermissions: async () => {
    const response = await fetch("/api/user/permissions");
    return response.json();
  },
});
```

### Problem: Losing Permissions on Page Reload

```ts
// ❌ Wrong: Permissions lost on reload
app.use(PermissionPlugin, {
  permissions: ["admin"],
  persist: false, // Disabled persistence
});

// ✅ Correct: Persist by default
app.use(PermissionPlugin, {
  permissions: ["admin"],
  persist: true, // Default behavior
});

// Or explicitly fetch on reload
app.use(PermissionPlugin, {
  fetchPermissions: async () => {
    const response = await fetch("/api/user/permissions");
    if (response.ok) {
      return response.json();
    }
    // Fallback to stored permissions
    const stored = localStorage.getItem("permissions");
    return stored ? JSON.parse(stored) : [];
  },
});
```

## Directive Mistakes

### Problem: Using v-permission on Components

```vue
<!-- ❌ Wrong: Components don't support directives like this -->
<MyComponent v-permission="'admin'" />

<!-- ✅ Correct: Wrap in element -->
<div v-permission="'admin'">
  <MyComponent />
</div>

<!-- ✅ Or check permission inside component -->
<script setup>
import { usePermission } from "vue-nuxt-permission";
const { canSync } = usePermission();

if (!canSync("admin")) {
  throw createError({ statusCode: 403 });
}
</script>
```

### Problem: Applying Multiple v-permission Directives

```vue
<!-- ❌ Wrong: Can't apply directive twice -->
<button v-permission="'admin'" v-permission="'verified'"></button>

<!-- ✅ Correct: Use AND mode -->
<button v-permission="{ permissions: ['admin', 'verified'], mode: 'and' }">
  Action
</button>

<!-- ✅ Or nest elements -->
<div v-permission="'admin'">
  <div v-permission="'verified'">
    Action
  </div>
</div>
```

### Problem: Using :show When You Should Remove

```vue
<!-- ❌ Might be wrong: Keeps sensitive elements in DOM -->
<AdminPanel v-permission:show="'admin'" />
<!-- User can see HTML, CSS, and possibly script logic -->

<!-- ✅ Better: Remove from DOM -->
<AdminPanel v-permission="'admin'" />
<!-- Element completely absent from DOM -->
```

## Router Guard Mistakes

### Problem: Not Handling All Route States

```ts
// ❌ Wrong: Only checks permission
router.beforeEach(async (to, from, next) => {
  if (to.meta.checkPermission) {
    const allowed = await can(to.meta.permissions);
    if (!allowed) {
      return next("/forbidden");
    }
  }
  next();
  // But what about authentication?
});

// ✅ Correct: Handles both auth and permissions
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return next("/login");
  }

  if (to.meta.checkPermission) {
    const allowed = await can(to.meta.permissions);
    if (!allowed) {
      return next("/forbidden");
    }
  }

  next();
});
```

### Problem: Not Defining Required Route Meta

```ts
// ❌ Wrong: No meta, no protection
{
  path: "/admin",
  component: AdminPanel,
  // No meta, no protection!
}

// ✅ Correct: Explicitly define requirements
{
  path: "/admin",
  component: AdminPanel,
  meta: {
    checkPermission: true,
    permissions: "admin",
  },
}
```

### Problem: Infinite Redirect Loops

```ts
// ❌ Wrong: Can cause redirect loop
{
  path: "/admin",
  meta: {
    checkPermission: true,
    permissions: "admin", // Redirects to /login
  },
},
{
  path: "/login",
  meta: {
    checkPermission: true,
    permissions: "guest", // Redirects back!
  },
}

// ✅ Correct: Don't protect login/auth routes
{
  path: "/login",
  component: LoginPage,
  // No permission check
}

{
  path: "/admin",
  meta: {
    checkPermission: true,
    permissions: "admin",
  },
}
```

## Composable Mistakes

### Problem: Using usePermission Outside Vue Context

```ts
// ❌ Wrong: usePermission needs Vue context
async function userService() {
  const { can } = usePermission(); // Error: no Vue context
  return await can("admin");
}

// ✅ Correct: Use in Vue component/composable
export const useUserPermissions = () => {
  const { can } = usePermission();

  return {
    checkPermission: async (perm) => await can(perm),
  };
};

// Then use in component
const { checkPermission } = useUserPermissions();
```

### Problem: Calling usePermission Multiple Times Unnecessarily

```vue
<!-- ❌ Wrong: Multiple calls -->
<script setup>
const { canSync } = usePermission();
const isAdmin = canSync("admin");

// Somewhere else in same component
const { can } = usePermission();
const canEdit = await can("edit");
</script>

<!-- ✅ Better: Single call -->
<script setup>
const { can, canSync } = usePermission();

const isAdmin = canSync("admin");
const canEdit = await can("edit");
</script>
```

## SSR/Hydration Mistakes

### Problem: Hydration Mismatch

```vue
<!-- ❌ Wrong: Different content on server vs client -->
<template>
  <div v-permission="'admin'">Admin Only</div>
</template>

<!-- ✅ Correct: Use ClientOnly wrapper -->
<template>
  <ClientOnly>
    <div v-permission="'admin'">Admin Only</div>
  </ClientOnly>
</template>
```

### Problem: Not Checking Permissions Server-Side

```ts
// ❌ Wrong: No server-side check
export default defineEventHandler(async (event) => {
  // Client can access this endpoint anyway
  return { sensitiveData: "..." };
});

// ✅ Correct: Server validates
export default defineEventHandler(async (event) => {
  const user = await getUser(event);

  if (!user.permissions.includes("admin")) {
    throw createError({ statusCode: 403 });
  }

  return { sensitiveData: "..." };
});
```

## Storage Mistakes

### Problem: Storing Permissions Insecurely

```ts
// ❌ Wrong: Storing sensitive data in plain text
localStorage.setItem("permissions", JSON.stringify(permissions));

// The library handles this correctly with Base64 encoding
// But don't do this yourself!
```

### Problem: Not Handling Storage Errors

```ts
// ❌ Wrong: No error handling
const stored = JSON.parse(localStorage.getItem("permissions"));
const perms = stored.permissions; // Could throw

// ✅ Correct: Handle errors
try {
  const stored = localStorage.getItem("permissions");
  const perms = stored ? JSON.parse(atob(stored)) : [];
} catch (error) {
  console.error("Failed to load permissions:", error);
  const perms = [];
}
```

## Testing Mistakes

### Problem: Not Testing Permission Denials

```ts
// ❌ Wrong: Only tests success case
it("shows admin content", () => {
  const wrapper = mount(AdminPanel, {
    props: { permissions: ["admin"] },
  });
  expect(wrapper.text()).toContain("Admin");
});

// ✅ Correct: Test both cases
it("shows admin content for admins", () => {
  const wrapper = mount(AdminPanel, {
    props: { permissions: ["admin"] },
  });
  expect(wrapper.text()).toContain("Admin");
});

it("hides admin content for non-admins", () => {
  const wrapper = mount(AdminPanel, {
    props: { permissions: ["user"] },
  });
  expect(wrapper.text()).not.toContain("Admin");
});
```

### Problem: Not Mocking Permission Checks in Tests

```ts
// ❌ Wrong: Tests depend on real permissions
it("deletes post when allowed", async () => {
  // Real permission check happens
  const wrapper = mount(PostManager, {
    props: { canDelete: true },
  });
  // Test might be flaky
});

// ✅ Correct: Mock permission checks
vi.mock("vue-nuxt-permission", () => ({
  usePermission: () => ({
    canSync: vi.fn((perm) => perm === "post.delete"),
  }),
}));

it("deletes post when allowed", async () => {
  const wrapper = mount(PostManager);
  expect(wrapper.find(".delete-btn").attributes("disabled")).toBeFalsy();
});
```
