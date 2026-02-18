import { mount, flushPromises } from "@vue/test-utils";
import { createApp } from "vue";
import PermissionPlugin from "../src/plugin";
import { usePermission } from "../src/composables/usePermission";
import { describe, it, expect } from "vitest";

describe("Integration: vue-nuxt-permission", () => {
  it("installs plugin and exposes composable correctly", async () => {
    const app = createApp({});
    await app.use(PermissionPlugin, {
      permissions: ["dashboard.view", "users.list"],
      developmentMode: true,
    });

    const wrapper = mount({
      template: `<div v-if="canSync('dashboard.view')">Allowed</div>`,
      setup() {
        const { canSync } = usePermission();
        return { canSync };
      },
    });

    expect(wrapper.text()).toContain("Allowed");
  });

  it("evaluates async permission using hasPermission()", async () => {
    const app = createApp({});
    await app.use(PermissionPlugin, {
      permissions: ["users.edit", "users.delete"],
    });

    const wrapper = mount({
      template: `<div>{{ result }}</div>`,
      async setup() {
        const { can } = usePermission();
        const result = await can(["users.edit"]);
        return { result };
      },
    });

    // Flush all pending promises to let the async setup complete
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("true");
  });
});
