import { defineNuxtModule, addPlugin, createResolver } from "@nuxt/kit";

export interface ModuleOptions {
  permissions?: string[];
  developmentMode?: boolean;
  fetchPermissions?: string | (() => Promise<string[]>);
  persist?: boolean;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "vue-nuxt-permission",
    configKey: "permission",
    compatibility: {
      nuxt: "^3.0.0",
    },
  },

  defaults: {
    permissions: [],
    developmentMode: false,
    persist: true,
  },

  setup(options, nuxt) {
    // Validate options early
    if (options.permissions && !Array.isArray(options.permissions)) {
      throw new TypeError("[vue-nuxt-permission] permissions must be an array");
    }

    if (
      options.fetchPermissions &&
      typeof options.fetchPermissions !== "string" &&
      typeof options.fetchPermissions !== "function"
    ) {
      throw new TypeError(
        "[vue-nuxt-permission] fetchPermissions must be a URL string or async function"
      );
    }

    const resolver = createResolver(import.meta.url);

    addPlugin({
      src: resolver.resolve("./runtime/plugin"),
      mode: "all",
    });

    nuxt.options.runtimeConfig.public.permission = options;
  },
});
