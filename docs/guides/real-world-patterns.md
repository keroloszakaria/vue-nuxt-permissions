# Real-World Usage Patterns

Proven patterns for common real-world permission scenarios.

## E-Commerce Platform

### Multi-Level Role System

Setup roles for different user types:

```ts
// permissions/ecommerce.ts
export const ROLES = {
  admin: [
    "products.manage",
    "products.publish",
    "orders.manage",
    "orders.refund",
    "users.manage",
    "settings.edit",
    "reports.view",
  ],
  seller: [
    "products.create",
    "products.edit.own",
    "products.publish",
    "orders.view.own",
    "reports.view.own",
  ],
  customer: ["products.view", "orders.create", "orders.view.own"],
};

export const PERMISSION_MAP = {
  admin: ROLES.admin,
  seller: ROLES.seller,
  customer: ROLES.customer,
};
```

### Product Management

```vue
<template>
  <div class="product-manager">
    <!-- View products (all authenticated users) -->
    <ProductList v-if="isAuthenticated" />

    <!-- Create/Edit (sellers and admins) -->
    <ProductEditor v-permission="['seller', 'admin']" />

    <!-- Publish (approved sellers and admins) -->
    <PublishControls
      v-permission="{
        permissions: ['products.publish'],
        mode: 'and',
      }"
    />

    <!-- Admin controls -->
    <AdminControls v-permission="'admin'" />
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
const isAuthenticated = canSync({
  permissions: ["customer", "seller", "admin"],
  mode: "or",
});
</script>
```

### Order Management

```vue
<template>
  <div class="order-management">
    <!-- View own orders (customers) -->
    <MyOrders v-permission="'orders.create'" />

    <!-- View all orders (sellers) -->
    <SellerOrders v-permission="'orders.view.own'" />

    <!-- Manage orders (admins) -->
    <AdminOrders v-permission="'orders.manage'" />

    <!-- Refund controls (admins only) -->
    <RefundControls v-permission="'orders.refund'" />
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
</script>
```

## SaaS Application

### Team and Organization Management

```ts
// permissions/saas.ts
export const PERMISSIONS = {
  // Organization
  ORG_VIEW: "organization.view",
  ORG_EDIT: "organization.edit",
  ORG_DELETE: "organization.delete",
  ORG_MANAGE_MEMBERS: "organization.manage_members",

  // Project
  PROJECT_VIEW: "project.view",
  PROJECT_CREATE: "project.create",
  PROJECT_EDIT: "project.edit",
  PROJECT_DELETE: "project.delete",

  // Workspace
  WORKSPACE_VIEW: "workspace.view",
  WORKSPACE_EDIT: "workspace.edit",
  WORKSPACE_INVITE: "workspace.invite",
};

export const TEAM_ROLES = {
  owner: [
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ORG_EDIT,
    PERMISSIONS.ORG_DELETE,
    PERMISSIONS.ORG_MANAGE_MEMBERS,
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_EDIT,
    PERMISSIONS.PROJECT_DELETE,
  ],
  admin: [
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ORG_EDIT,
    PERMISSIONS.ORG_MANAGE_MEMBERS,
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_EDIT,
    PERMISSIONS.PROJECT_DELETE,
  ],
  member: [
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_EDIT,
  ],
  viewer: [PERMISSIONS.ORG_VIEW, PERMISSIONS.PROJECT_VIEW],
};
```

### Organization Switcher

```vue
<template>
  <div class="org-switcher">
    <select v-model="selectedOrg" @change="switchOrg">
      <option v-for="org in organizations" :key="org.id" :value="org.id">
        {{ org.name }}
      </option>
    </select>

    <!-- Show controls based on org role -->
    <div v-if="canEdit" class="controls">
      <button @click="editOrg">Edit Organization</button>
      <button v-permission="'organization.delete'">Delete Organization</button>
      <button v-permission="'organization.manage_members'">
        Manage Members
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { canSync, setPermissions } = usePermission();

const organizations = ref([
  { id: 1, name: "My Org", role: "owner" },
  { id: 2, name: "Team Org", role: "member" },
]);

const selectedOrg = ref(1);

const canEdit = computed(() => {
  const org = organizations.value.find((o) => o.id === selectedOrg.value);
  return org && ["owner", "admin"].includes(org.role);
});

const switchOrg = async () => {
  // Fetch new permissions for selected org
  const response = await fetch(`/api/org/${selectedOrg.value}/permissions`);
  const { permissions } = await response.json();
  setPermissions(permissions);
};
</script>
```

## Content Management System (CMS)

### Publishing Workflow

```ts
// permissions/cms.ts
export const PUBLISHING_PERMISSIONS = {
  DRAFT_CREATE: "content.draft.create",
  DRAFT_EDIT: "content.draft.edit",
  DRAFT_DELETE: "content.draft.delete",

  REVIEW_REQUEST: "content.review.request",
  REVIEW_APPROVE: "content.review.approve",
  REVIEW_REJECT: "content.review.reject",

  PUBLISH: "content.publish",
  UNPUBLISH: "content.unpublish",

  SCHEDULE: "content.schedule",
};

export const CMS_ROLES = {
  admin: Object.values(PUBLISHING_PERMISSIONS),
  editor: [
    PUBLISHING_PERMISSIONS.DRAFT_CREATE,
    PUBLISHING_PERMISSIONS.DRAFT_EDIT,
    PUBLISHING_PERMISSIONS.DRAFT_DELETE,
    PUBLISHING_PERMISSIONS.REVIEW_REQUEST,
    PUBLISHING_PERMISSIONS.PUBLISH,
  ],
  reviewer: [
    PUBLISHING_PERMISSIONS.REVIEW_APPROVE,
    PUBLISHING_PERMISSIONS.REVIEW_REJECT,
  ],
  author: [
    PUBLISHING_PERMISSIONS.DRAFT_CREATE,
    PUBLISHING_PERMISSIONS.DRAFT_EDIT,
    PUBLISHING_PERMISSIONS.DRAFT_DELETE,
    PUBLISHING_PERMISSIONS.REVIEW_REQUEST,
  ],
};
```

### Content Publishing Workflow UI

```vue
<template>
  <div class="content-editor">
    <h1>{{ content.title }}</h1>

    <!-- Edit draft (authors, editors, admins) -->
    <button v-permission="'content.draft.edit'">Edit</button>

    <!-- Request review (authors, editors) -->
    <button v-permission="'content.review.request'" :disabled="!isDraft">
      Request Review
    </button>

    <!-- Review controls (reviewers, admins) -->
    <div v-if="isUnderReview">
      <button v-permission="'content.review.approve'" @click="approve">
        Approve
      </button>
      <button v-permission="'content.review.reject'" @click="reject">
        Reject
      </button>
    </div>

    <!-- Publish (editors, admins) -->
    <button
      v-permission="'content.publish'"
      :disabled="!isApproved"
      @click="publish"
    >
      Publish
    </button>

    <!-- Schedule (admins, editors with permission) -->
    <button v-permission="'content.schedule'">Schedule Publication</button>

    <!-- Unpublish (admins only) -->
    <button v-permission="'content.unpublish'">Unpublish</button>

    <!-- Delete (admins) -->
    <button v-permission="'content.draft.delete'">Delete Draft</button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();

const props = defineProps({
  content: Object,
});

const isDraft = computed(() => props.content.status === "draft");
const isUnderReview = computed(() => props.content.status === "pending_review");
const isApproved = computed(() => props.content.status === "approved");

const approve = async () => {
  const allowed = await can("content.review.approve");
  if (!allowed) return;
  // Approve logic
};

const reject = async () => {
  const allowed = await can("content.review.reject");
  if (!allowed) return;
  // Reject logic
};

const publish = async () => {
  const allowed = await can("content.publish");
  if (!allowed) return;
  // Publish logic
};
</script>
```

## Project Management Tool

### Team Collaboration

```ts
// permissions/project-management.ts
export const PROJECT_PERMISSIONS = {
  // Project level
  PROJECT_VIEW: "project.view",
  PROJECT_EDIT: "project.edit",
  PROJECT_DELETE: "project.delete",

  // Task level
  TASK_CREATE: "task.create",
  TASK_EDIT: "task.edit",
  TASK_EDIT_OWN: "task.edit.own",
  TASK_DELETE: "task.delete",
  TASK_ASSIGN: "task.assign",

  // Comment level
  COMMENT_CREATE: "comment.create",
  COMMENT_DELETE: "comment.delete",
  COMMENT_DELETE_ANY: "comment.delete.any",

  // Reporting
  REPORT_VIEW: "report.view",
  REPORT_EXPORT: "report.export",
};

export const PROJECT_ROLES = {
  owner: Object.values(PROJECT_PERMISSIONS),
  manager: [
    PROJECT_PERMISSIONS.PROJECT_VIEW,
    PROJECT_PERMISSIONS.PROJECT_EDIT,
    PROJECT_PERMISSIONS.TASK_CREATE,
    PROJECT_PERMISSIONS.TASK_EDIT,
    PROJECT_PERMISSIONS.TASK_DELETE,
    PROJECT_PERMISSIONS.TASK_ASSIGN,
    PROJECT_PERMISSIONS.COMMENT_CREATE,
    PROJECT_PERMISSIONS.COMMENT_DELETE_ANY,
    PROJECT_PERMISSIONS.REPORT_VIEW,
  ],
  member: [
    PROJECT_PERMISSIONS.PROJECT_VIEW,
    PROJECT_PERMISSIONS.TASK_CREATE,
    PROJECT_PERMISSIONS.TASK_EDIT_OWN,
    PROJECT_PERMISSIONS.COMMENT_CREATE,
    PROJECT_PERMISSIONS.COMMENT_DELETE,
  ],
  viewer: [PROJECT_PERMISSIONS.PROJECT_VIEW, PROJECT_PERMISSIONS.REPORT_VIEW],
};
```

### Task Card with Permission-Based Actions

```vue
<template>
  <div class="task-card" :class="task.priority">
    <h3>{{ task.title }}</h3>
    <p>{{ task.description }}</p>

    <div class="task-meta">
      <span>Assigned to: {{ task.assignee }}</span>
      <span>Priority: {{ task.priority }}</span>
    </div>

    <div class="task-actions">
      <!-- Edit task -->
      <button
        v-permission="{
          permissions: ['task.edit', 'task.edit.own'],
          mode: 'or',
        }"
        @click="editTask"
      >
        Edit
      </button>

      <!-- Delete task (only for managers/owners) -->
      <button v-permission="'task.delete'" @click="deleteTask">Delete</button>

      <!-- Assign task (only managers/owners) -->
      <button v-permission="'task.assign'" @click="showAssignDialog">
        Assign
      </button>

      <!-- Add comment (anyone) -->
      <button v-permission="'comment.create'">Comment</button>
    </div>

    <!-- Comments section -->
    <div v-if="showComments" class="comments">
      <div v-for="comment in task.comments" :key="comment.id" class="comment">
        <p>{{ comment.text }}</p>

        <!-- Delete own comments -->
        <button
          v-permission="'comment.delete'"
          @click="deleteComment(comment.id)"
        >
          Delete
        </button>

        <!-- Delete any comment (managers) -->
        <button
          v-permission="'comment.delete.any'"
          @click="deleteComment(comment.id)"
        >
          Remove (Admin)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { usePermission } from "vue-nuxt-permission";

const { can, canSync } = usePermission();

const props = defineProps({
  task: Object,
});

const showComments = ref(false);

const editTask = async () => {
  const allowed = await can({
    permissions: ["task.edit", "task.edit.own"],
    mode: "or",
  });
  if (!allowed) return;
  // Edit logic
};

const deleteTask = async () => {
  const allowed = await can("task.delete");
  if (!allowed) return;
  // Delete logic
};

const deleteComment = async (commentId) => {
  const allowed = await can({
    permissions: ["comment.delete", "comment.delete.any"],
    mode: "or",
  });
  if (!allowed) return;
  // Delete comment logic
};
</script>
```

## Analytics Dashboard

### Role-Based Data Access

```ts
// permissions/analytics.ts
export const ANALYTICS_PERMISSIONS = {
  // Basic access
  DASHBOARD_VIEW: "analytics.dashboard.view",

  // Reports
  REPORT_VIEW: "analytics.report.view",
  REPORT_CUSTOM: "analytics.report.custom",

  // Data export
  DATA_EXPORT: "analytics.data.export",
  DATA_EXPORT_FULL: "analytics.data.export.full",

  // Advanced features
  PREDICTIVE_ANALYTICS: "analytics.predictive",
  COHORT_ANALYSIS: "analytics.cohort",
};
```

### Dynamic Dashboard Widget Visibility

```vue
<template>
  <div class="analytics-dashboard">
    <h1>Analytics Dashboard</h1>

    <!-- Basic metrics (everyone) -->
    <div v-if="canSync('analytics.dashboard.view')" class="widgets">
      <OverviewWidget />
      <TrafficWidget />
    </div>

    <!-- User behavior (analysts+) -->
    <div
      v-if="
        canSync({
          permissions: ['analytics.report.view', 'analytics.dashboard.view'],
          mode: 'and',
        })
      "
      class="widgets"
    >
      <UserBehaviorWidget />
      <ConversionFunnelWidget />
    </div>

    <!-- Advanced analytics (senior analysts+) -->
    <div v-permission="'analytics.predictive'" class="widgets">
      <PredictiveAnalyticsWidget />
    </div>

    <div v-permission="'analytics.cohort'" class="widgets">
      <CohortAnalysisWidget />
    </div>

    <!-- Reporting controls -->
    <div class="controls">
      <button v-permission="'analytics.report.view'">View Reports</button>

      <button v-permission="'analytics.report.custom'">
        Create Custom Report
      </button>

      <button v-permission="'analytics.data.export'">Export Data</button>

      <button v-permission="'analytics.data.export.full'">
        Export Full Dataset
      </button>
    </div>
  </div>
</template>

<script setup>
import { usePermission } from "vue-nuxt-permission";

const { canSync } = usePermission();
</script>
```

## API Management Platform

### API Key and Quota Management

```ts
// permissions/api-management.ts
export const API_PERMISSIONS = {
  API_KEY_CREATE: "api.key.create",
  API_KEY_VIEW: "api.key.view",
  API_KEY_REVOKE: "api.key.revoke",

  QUOTA_VIEW: "api.quota.view",
  QUOTA_EDIT: "api.quota.edit",

  USAGE_VIEW: "api.usage.view",
  USAGE_ANALYTICS: "api.usage.analytics",
};
```

### API Keys Management UI

```vue
<template>
  <div class="api-management">
    <h2>API Keys</h2>

    <!-- View API keys -->
    <div v-permission="'api.key.view'" class="api-keys-list">
      <div v-for="key in apiKeys" :key="key.id" class="api-key-item">
        <span class="key-name">{{ key.name }}</span>
        <span class="key-value">{{ maskedKey(key.value) }}</span>

        <!-- Revoke key -->
        <button v-permission="'api.key.revoke'" @click="revokeKey(key.id)">
          Revoke
        </button>
      </div>
    </div>

    <!-- Create new key -->
    <button v-permission="'api.key.create'" @click="showCreateKeyDialog = true">
      Create New Key
    </button>

    <!-- Usage tracking -->
    <div v-permission="'api.usage.view'" class="usage-section">
      <h3>API Usage</h3>
      <UsageChart />
    </div>

    <!-- Advanced analytics -->
    <div v-permission="'api.usage.analytics'" class="analytics-section">
      <h3>Detailed Analytics</h3>
      <AnalyticsPanel />
    </div>

    <!-- Quota management -->
    <div v-permission="'api.quota.view'" class="quota-section">
      <h3>Rate Limits & Quotas</h3>
      <QuotaDisplay :quotas="quotas" />

      <!-- Edit quotas (admins) -->
      <button v-permission="'api.quota.edit'" @click="editQuotas">
        Edit Quotas
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const apiKeys = ref([]);
const quotas = ref([]);
const showCreateKeyDialog = ref(false);

const maskedKey = (key) => {
  return key.substring(0, 4) + "..." + key.substring(key.length - 4);
};

const revokeKey = async (keyId) => {
  // Revoke logic
};

const editQuotas = async () => {
  // Edit logic
};
</script>
```

These patterns demonstrate how vue-nuxt-permission scales from simple to complex real-world applications with sophisticated permission requirements.
