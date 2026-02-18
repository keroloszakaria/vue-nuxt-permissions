import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createApp, ref } from "vue";
import { vPermission } from "../src/directives/v-permission";
import PermissionPlugin from "../src/plugin";
import { configurePermission } from "../src/core/config";
import { clearPermissionCache } from "../src/core/cache";

describe("v-permission Directive", () => {
  beforeEach(() => {
    clearPermissionCache();
    configurePermission(["user.view", "post.edit"]);
  });

  afterEach(() => {
    clearPermissionCache();
  });

  describe("Basic rendering", () => {
    it("renders allowed element", async () => {
      const wrapper = mount(
        {
          template: `
            <div>
              <h1 v-permission="'view.dashboard'">Dashboard</h1>
              <h2 v-permission="'admin.only'">Admin</h2>
            </div>
          `,
        },
        {
          global: {
            plugins: [[PermissionPlugin, { permissions: ["view.dashboard"] }]],
          },
        }
      );

      expect(wrapper.html()).toContain("Dashboard");
    });

    it("removes disallowed element", async () => {
      const wrapper = mount(
        {
          template: `
            <div>
              <h1 v-permission="'view.dashboard'">Dashboard</h1>
              <h2 v-permission="'admin.only'">Admin</h2>
            </div>
          `,
        },
        {
          global: {
            plugins: [[PermissionPlugin, { permissions: ["view.dashboard"] }]],
          },
        }
      );

      expect(wrapper.html()).not.toContain("Admin");
    });

    it("renders element when permission exists", async () => {
      const wrapper = mount(
        {
          template: `<button v-permission="'user.view'">View Users</button>`,
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["user.view"],
                },
              ],
            ],
          },
        }
      );

      expect(wrapper.html()).toContain("View Users");
      expect(wrapper.find("button").exists()).toBe(true);
    });

    it("removes element when permission is missing", async () => {
      const wrapper = mount(
        {
          template: `<button v-permission="'admin.access'">Admin Panel</button>`,
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["user.view"],
                },
              ],
            ],
          },
        }
      );

      await wrapper.vm.$nextTick();
      // Element should be removed from DOM (no parent)
      expect((wrapper.element as any).parentNode).toBeNull();
    });

    it("hides element with v-permission:show when permission missing", async () => {
      const wrapper = mount(
        {
          template: `<div v-permission:show="'admin'">Hidden Content</div>`,
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["user.view"],
                },
              ],
            ],
          },
        }
      );

      const el = wrapper.find("div");
      expect(el.exists()).toBe(true);
      expect(el.element.style.display).toBe("none");
    });

    it("shows element with v-permission:show when permission exists", async () => {
      const wrapper = mount(
        {
          template: `<div v-permission:show="'user.view'">Visible Content</div>`,
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["user.view"],
                },
              ],
            ],
          },
        }
      );

      const el = wrapper.find("div");
      expect(el.element.style.display).not.toBe("none");
    });
  });

  describe("Permission value types", () => {
    it("accepts string permission", async () => {
      const wrapper = mount(
        {
          template: `<div v-permission="'user.view'">Content</div>`,
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["user.view"],
                },
              ],
            ],
          },
        }
      );

      expect(wrapper.find("div").exists()).toBe(true);
    });

    it("accepts array of permissions (OR logic)", async () => {
      const wrapper = mount(
        {
          template: `<div v-permission="['admin', 'user.view']">Content</div>`,
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["user.view"],
                },
              ],
            ],
          },
        }
      );

      expect(wrapper.find("div").exists()).toBe(true);
    });

    it("accepts object with mode AND", async () => {
      const wrapper = mount(
        {
          template: `<div v-permission="{ permissions: ['user.view', 'post.edit'], mode: 'and' }">Content</div>`,
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["user.view", "post.edit"],
                },
              ],
            ],
          },
        }
      );

      expect(wrapper.find("div").exists()).toBe(true);
    });

    it("accepts wildcard permission", async () => {
      const wrapper = mount(
        {
          template: `<div v-permission="'*'">Universal Access</div>`,
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["any.permission"],
                },
              ],
            ],
          },
        }
      );

      expect(wrapper.find("div").exists()).toBe(true);
    });
  });

  describe("Dynamic updates", () => {
    it("updates when permission value changes", async () => {
      const perm = ref("allowed.perm");
      const wrapper = mount(
        {
          template: `<div v-permission="perm">Content</div>`,
          setup() {
            return { perm };
          },
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["allowed.perm", "another.perm"],
                },
              ],
            ],
          },
        }
      );

      // Element should be in DOM initially
      expect((wrapper.element as any).parentNode).not.toBeNull();

      perm.value = "forbidden.perm";
      await wrapper.vm.$nextTick();

      // Should be removed from DOM (no parent)
      expect((wrapper.element as any).parentNode).toBeNull();
    });

    it("restores element when permissions are granted", async () => {
      const perm = ref("forbidden");
      const wrapper = mount(
        {
          template: `<div v-permission="perm">Conditional Content</div>`,
          setup() {
            return { perm };
          },
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["allowed"],
                },
              ],
            ],
          },
        }
      );

      // Initially removed (no parent)
      expect((wrapper.element as any).parentNode).toBeNull();

      perm.value = "allowed";
      await wrapper.vm.$nextTick();

      // Should be restored (has parent)
      expect((wrapper.element as any).parentNode).not.toBeNull();
    });

    it("updates visibility with v-permission:show on change", async () => {
      const perm = ref("forbidden");
      const wrapper = mount(
        {
          template: `<div v-permission:show="perm">Conditional Visibility</div>`,
          setup() {
            return { perm };
          },
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["allowed"],
                },
              ],
            ],
          },
        }
      );

      // Initially hidden
      expect(wrapper.find("div").element.style.display).toBe("none");

      perm.value = "allowed";
      await wrapper.vm.$nextTick();

      // Should be visible
      expect(wrapper.find("div").element.style.display).not.toBe("none");
    });
  });

  describe("Modifiers", () => {
    it(".once modifier prevents updates", async () => {
      const perm = ref("allowed");

      const wrapper = mount(
        {
          template: `<div v-permission.once="perm">Once Only</div>`,
          setup() {
            return { perm };
          },
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["allowed", "new"],
                },
              ],
            ],
          },
        }
      );

      expect(wrapper.find("div").exists()).toBe(true);

      perm.value = "forbidden";
      await wrapper.vm.$nextTick();

      // With .once, should still exist despite permission change
      expect(wrapper.find("div").exists()).toBe(true);
    });

    it(".lazy modifier skips updates if value hasn't changed", async () => {
      const perm = ref("allowed");
      const wrapper = mount(
        {
          template: `<div v-permission.lazy="perm">Lazy Update</div>`,
          setup() {
            return { perm };
          },
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["allowed"],
                },
              ],
            ],
          },
        }
      );

      expect(wrapper.find("div").exists()).toBe(true);

      // Same value, should not trigger update
      perm.value = "allowed";
      await wrapper.vm.$nextTick();
      expect(wrapper.find("div").exists()).toBe(true);
    });
  });

  describe("Multiple directives on page", () => {
    it("handles multiple permissions on same page", async () => {
      const wrapper = mount(
        {
          template: `
            <div>
              <button v-permission="'user.view'">View Users</button>
              <button v-permission="'post.edit'">Edit Posts</button>
              <button v-permission="'admin.access'">Admin</button>
            </div>
          `,
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["user.view", "post.edit"],
                },
              ],
            ],
          },
        }
      );

      expect(wrapper.html()).toContain("View Users");
      expect(wrapper.html()).toContain("Edit Posts");
      expect(wrapper.html()).not.toContain("Admin");
    });
  });

  describe("Edge cases", () => {
    it("handles nested elements with v-permission", async () => {
      const wrapper = mount(
        {
          template: `
            <div v-permission="'parent'">
              <div v-permission="'child'">Child Content</div>
            </div>
          `,
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["parent", "child"],
                },
              ],
            ],
          },
        }
      );

      expect(wrapper.html()).toContain("Child Content");
    });

    it("handles permission with special characters", async () => {
      const wrapper = mount(
        {
          template: `<div v-permission="'user@example.com:edit'">Content</div>`,
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["user@example.com:edit"],
                },
              ],
            ],
          },
        }
      );

      expect(wrapper.find("div").exists()).toBe(true);
    });
  });

  describe("Show modifier behavior", () => {
    it("preserves element with show modifier but hides it", async () => {
      const wrapper = mount(
        {
          template: `<div v-permission:show="'forbidden'" style="display: block">Content</div>`,
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["allowed"],
                },
              ],
            ],
          },
        }
      );

      const el = wrapper.find("div");
      expect(el.exists()).toBe(true);
      expect(el.element.style.display).toBe("none");
    });

    it("restores original display value with show modifier", async () => {
      const perm = ref("forbidden");
      const wrapper = mount(
        {
          template: `<div v-permission:show="perm" style="display: flex">Content</div>`,
          setup() {
            return { perm };
          },
        },
        {
          global: {
            plugins: [
              [
                PermissionPlugin,
                {
                  permissions: ["allowed"],
                },
              ],
            ],
          },
        }
      );

      expect(wrapper.find("div").element.style.display).toBe("none");

      perm.value = "allowed";
      await wrapper.vm.$nextTick();

      expect(wrapper.find("div").element.style.display).toBe("flex");
    });
  });
});
