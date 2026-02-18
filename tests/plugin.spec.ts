import { describe, it, expect } from "vitest";
import { createApp } from "vue";
import PermissionPlugin from "../src/plugin";

describe("PermissionPlugin", () => {
  it("installs correctly", () => {
    const app = createApp({});
    app.use(PermissionPlugin, { permissions: ["test"] });
    expect(app._context.app).toBeDefined();
  });

  it("registers directive properly", () => {
    const app = createApp({});
    app.use(PermissionPlugin, { permissions: ["user.view"] });
    expect(app._context.directives).toHaveProperty("permission");
  });
});
