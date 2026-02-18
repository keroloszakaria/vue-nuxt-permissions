const STORAGE_KEY = "__v_permission__";

// Check if browser environment is available (dynamic check to support testing)
const getIsBrowser = (): boolean =>
  typeof window !== "undefined" && typeof localStorage !== "undefined";

const encrypt = (value: any): string => {
  try {
    const json = JSON.stringify(value);
    // Use TextEncoder for proper unicode handling
    if (typeof TextEncoder !== "undefined") {
      const encoded = new TextEncoder().encode(json);
      const binaryString = Array.from(encoded, (byte) =>
        String.fromCharCode(byte)
      ).join("");
      return btoa(binaryString);
    }
    // Fallback for environments without TextEncoder
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return "";
  }
};

const decrypt = (value: string): any => {
  try {
    const binaryString = atob(value);
    // Use TextDecoder for proper unicode handling
    if (typeof TextDecoder !== "undefined") {
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const json = new TextDecoder().decode(bytes);
      return JSON.parse(json);
    }
    // Fallback
    const json = decodeURIComponent(escape(binaryString));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const savePermissionsToStorage = (permissions: any) => {
  if (!getIsBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, encrypt(permissions));
  } catch (e) {
    console.warn("[v-permission] Failed to save permissions to storage:", e);
  }
};

export const getPermissionsFromStorage = () => {
  if (!getIsBrowser()) return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? decrypt(stored) : null;
  } catch (e) {
    console.warn("[v-permission] Failed to read permissions from storage:", e);
    return null;
  }
};

export const clearPermissionsFromStorage = () => {
  if (!getIsBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("[v-permission] Failed to clear permissions from storage:", e);
  }
};
