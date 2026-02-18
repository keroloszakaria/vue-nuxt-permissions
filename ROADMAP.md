# 🧩 vue-nuxt-permission — Development Roadmap

> Maintained by **Jervis Labs**  
> Author: Kerolos Zakaria  
> Scope: Universal Permission System for Vue 3 + Nuxt 3  
> Current Version: **2.0.2**  
> Target: v3.0.0 (Next Major)

---

## 🏁 Overview

`vue-nuxt-permission` is a hybrid permission management system for both Vue and Nuxt environments.  
It provides a unified API for access control using directives, guards, and helpers with caching and storage layers.

---

## 📦 Version Timeline

| Version    | Codename    | Focus Area                      | Status         | Period  |
| ---------- | ----------- | ------------------------------- | -------------- | ------- |
| **v1.0.0** | Foundation  | Core directive + helpers        | ✅ Complete    | Q2 2024 |
| **v2.0.x** | Stability   | Modular structure + cache       | ✅ Current     | Q4 2025 |
| **v2.1.0** | Integration | Async permissions + Nuxt module | 🚧 In Progress | Q4 2025 |
| **v3.0.0** | Enterprise  | Dynamic API, multi-source roles | ⏳ Planned     | 2026    |

---

## 🔹 v1 — Foundation (Completed)

### 🎯 Goal

Create the basic permission directive system with local configuration.

### ✅ Features

- `v-permission` directive with `show`, `once`, `lazy` modifiers.
- `globalGuard()` for route-level control.
- LocalStorage persistence via `permissionStorage.ts`.
- In-memory caching system.
- TypeScript types for Permissions and Guards.

### 📁 Structure

```
src/
├── directives/v-permission.ts
├── guards/globalGuard.ts
└── utils/
```

---

## 🔹 v2 — Modular & Hybrid (Current Stage)

### 🎯 Goal

Refactor architecture for hybrid Vue/Nuxt support + advanced helpers.

### ✅ Added

- New **core/** layer for evaluation, cache, config separation.
- `plugin.ts` refactored for async-safe initialization.
- TypeScript strict typing and refactor of permission object modes.
- Improved error handling and dev warnings.
- Exports unified through `index.ts`.

### 🧩 v2.1.0 (In progress)

- Add support for **`fetchPermissions()`** to load roles from API.
- Add **`createPermissionGuard()`** for modular route guards.
- Add **Nuxt module** integration (`src/module.ts`).
- Add `enablePermissionDebug()` for development insights.

---

## 🔹 v3 — Enterprise Edition (Planned)

### 🎯 Goal

Make the system enterprise-ready, with multi-source + server sync.

### 🚀 Planned Features

- **Dynamic permissions source** (API/WebSocket).
- **Role groups** (e.g., `admin:write`, `user:read` inheritance).
- SSR-safe support for Nuxt (detects `process.server`).
- **Pinia integration** to auto-sync user permissions.
- **DevTools tab** to inspect active permissions.
- Optional UI hints (blur, disable, or hide strategies).

### 🧱 Expected Structure

```
src/
├── core/
│   ├── apiSource.ts
│   ├── piniaIntegration.ts
│   └── ssrSupport.ts
└── ui/
    ├── components/
    └── decorators/
```

---

## 📚 Documentation Plan

| Area          | Description                       | Status |
| ------------- | --------------------------------- | ------ |
| README.md     | Basic usage + examples            | ✅     |
| ROADMAP.md    | Version strategy & team alignment | ✅     |
| examples/     | Vue + Nuxt demos                  | 🚧     |
| CHANGELOG.md  | Per-release notes                 | ⏳     |
| API Reference | Auto-generated docs (typedoc)     | ⏳     |

---

## 🧠 Team Notes

- Ownership: **Jervis Labs → Core Team**
- Publishing: via npm under org `@jervis-tech/vue-nuxt-permission`
- Nuxt Directory registration: [nuxt.com/modules/new](https://nuxt.com/modules/new)
- Dev branches:
  - `main` → stable npm releases
  - `next` → experimental v3 features
  - `docs` → documentation site (vitepress)

---

## 🧭 Next Step

**Current Focus:**  
→ Complete **Phase 2.1.0 Integration**

- [ ] Implement async permission fetching
- [ ] Add Nuxt module auto-registration
- [ ] Improve README with examples
- [ ] Prepare npm publish script

---

> 🧠 Maintainer Tip:  
> Each new version must update both `package.json` and `ROADMAP.md`.  
> Keep the file as the single source of truth for progress tracking.

---

**© 2025 Jervis Labs – All rights reserved.**
