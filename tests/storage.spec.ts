import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  savePermissionsToStorage,
  getPermissionsFromStorage,
  clearPermissionsFromStorage,
} from "../src/utils/storage";

describe("Storage Layer (storage.ts)", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("savePermissionsToStorage", () => {
    it("saves permissions to localStorage correctly", () => {
      const permissions = ["user.view", "user.edit"];
      savePermissionsToStorage(permissions);

      const stored = localStorage.getItem("__v_permission__");
      expect(stored).toBeTruthy();

      // Verify it's base64 encoded
      const decoded = JSON.parse(atob(stored!));
      expect(decoded).toEqual(permissions);
    });

    it("handles empty permissions array", () => {
      savePermissionsToStorage([]);

      const stored = localStorage.getItem("__v_permission__");
      const decoded = JSON.parse(atob(stored!));
      expect(decoded).toEqual([]);
    });

    it("handles complex permission objects", () => {
      const permissions = [
        "simple.permission",
        "complex:permission:with:colons",
        "permission.with.dots",
      ];
      savePermissionsToStorage(permissions);

      const stored = localStorage.getItem("__v_permission__");
      const decoded = JSON.parse(atob(stored!));
      expect(decoded).toEqual(permissions);
    });

    it("overwrites existing permissions", () => {
      savePermissionsToStorage(["first.perm"]);
      let stored = localStorage.getItem("__v_permission__");
      let decoded = JSON.parse(atob(stored!));
      expect(decoded).toEqual(["first.perm"]);

      savePermissionsToStorage(["second.perm", "third.perm"]);
      stored = localStorage.getItem("__v_permission__");
      decoded = JSON.parse(atob(stored!));
      expect(decoded).toEqual(["second.perm", "third.perm"]);
    });

    it("handles corrupted JSON gracefully", () => {
      // Manually set invalid base64
      localStorage.setItem("__v_permission__", "invalid-base64!!!");

      // Saving should still work
      const newPerms = ["valid.permission"];
      expect(() => savePermissionsToStorage(newPerms)).not.toThrow();

      const stored = localStorage.getItem("__v_permission__");
      const decoded = JSON.parse(atob(stored!));
      expect(decoded).toEqual(newPerms);
    });

    it("logs warning on storage quota exceeded", () => {
      const warnSpy = vi.spyOn(console, "warn");
      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("QuotaExceededError");
        });

      savePermissionsToStorage(["test"]);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to save permissions to storage"),
        expect.any(Error)
      );

      warnSpy.mockRestore();
      setItemSpy.mockRestore();
    });
  });

  describe("getPermissionsFromStorage", () => {
    it("retrieves permissions from localStorage correctly", () => {
      const original = ["perm1", "perm2", "perm3"];
      savePermissionsToStorage(original);

      const retrieved = getPermissionsFromStorage();
      expect(retrieved).toEqual(original);
    });

    it("returns null when no permissions are stored", () => {
      const retrieved = getPermissionsFromStorage();
      expect(retrieved).toBeNull();
    });

    it("returns null for corrupted storage data", () => {
      // Manually set invalid data
      localStorage.setItem("__v_permission__", "not-valid-base64!!!");

      const retrieved = getPermissionsFromStorage();
      expect(retrieved).toBeNull();
    });

    it("handles empty base64 string", () => {
      localStorage.setItem("__v_permission__", "");

      const retrieved = getPermissionsFromStorage();
      expect(retrieved).toBeNull();
    });

    it("logs warning on retrieval error", () => {
      const warnSpy = vi.spyOn(console, "warn");
      const getItemSpy = vi
        .spyOn(Storage.prototype, "getItem")
        .mockImplementation(() => {
          throw new Error("Storage access denied");
        });

      const retrieved = getPermissionsFromStorage();

      expect(retrieved).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to read permissions from storage"),
        expect.any(Error)
      );

      warnSpy.mockRestore();
      getItemSpy.mockRestore();
    });

    it("survives invalid JSON in storage", () => {
      // Valid base64 but invalid JSON
      const invalidJson = btoa("{ invalid json }");
      localStorage.setItem("__v_permission__", invalidJson);

      const retrieved = getPermissionsFromStorage();
      expect(retrieved).toBeNull();
    });
  });

  describe("clearPermissionsFromStorage", () => {
    it("removes permissions from localStorage", () => {
      savePermissionsToStorage(["test.perm"]);
      expect(localStorage.getItem("__v_permission__")).toBeTruthy();

      clearPermissionsFromStorage();
      expect(localStorage.getItem("__v_permission__")).toBeNull();
    });

    it("does not throw when storage is empty", () => {
      expect(() => clearPermissionsFromStorage()).not.toThrow();
    });

    it("logs warning on clear error", () => {
      const warnSpy = vi.spyOn(console, "warn");
      const removeItemSpy = vi
        .spyOn(Storage.prototype, "removeItem")
        .mockImplementation(() => {
          throw new Error("Storage locked");
        });

      clearPermissionsFromStorage();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to clear permissions from storage"),
        expect.any(Error)
      );

      warnSpy.mockRestore();
      removeItemSpy.mockRestore();
    });
  });

  describe("SSR Safety", () => {
    it("does not throw when localStorage is unavailable in SSR context", () => {
      // Simulate SSR environment by removing localStorage
      const savedStorage = global.localStorage;
      // @ts-ignore
      delete global.localStorage;

      expect(() => {
        savePermissionsToStorage(["test"]);
        getPermissionsFromStorage();
        clearPermissionsFromStorage();
      }).not.toThrow();

      // Restore
      global.localStorage = savedStorage;
    });

    it("safely handles window undefined", () => {
      const savedWindow = global.window;
      // @ts-ignore
      delete global.window;

      expect(() => {
        savePermissionsToStorage(["test"]);
      }).not.toThrow();

      global.window = savedWindow as any;
    });
  });

  describe("Encryption/Decryption", () => {
    it("properly encodes complex permission strings", () => {
      const permissions = [
        "admin:all",
        "user.view.detail",
        "report.export.pdf",
      ];
      savePermissionsToStorage(permissions);

      const stored = localStorage.getItem("__v_permission__");
      expect(stored).toBeTruthy();

      // Should be valid base64
      expect(() => atob(stored!)).not.toThrow();

      const decoded = JSON.parse(atob(stored!));
      expect(decoded).toEqual(permissions);
    });

    it("preserves unicode characters in permissions", () => {
      const permissions = ["用户.查看", "админ.доступ", "utilisateur.éditer"];
      savePermissionsToStorage(permissions);

      const retrieved = getPermissionsFromStorage();
      expect(retrieved).toEqual(permissions);
    });

    it("handles special characters in permissions", () => {
      const permissions = [
        "perm@domain.com",
        "user#123",
        "action$special&char",
      ];
      savePermissionsToStorage(permissions);

      const retrieved = getPermissionsFromStorage();
      expect(retrieved).toEqual(permissions);
    });
  });
});
