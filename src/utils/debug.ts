import { isDevMode } from "@/core";

export const logDebug = (...args: any[]) => {
  if (isDevMode()) {
    console.groupCollapsed("[v-permission:debug]");
    console.log(...args);
    console.groupEnd();
  }
};
