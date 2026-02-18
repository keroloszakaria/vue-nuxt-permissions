import { checkPermissionSync, hasPermission } from "@/core/evaluator";
import { logDebug } from "@/utils/debug";
import type { DirectiveBinding } from "vue";
import { isRef } from "vue";

/**
 * v-permission directive
 * -----------------------
 * Usage:
 * <button v-permission="'admin'">Admin Only</button>
 * <div v-permission:show="['editor','moderator']">Visible only for editors</div>
 */

interface PermissionElement extends HTMLElement {
  _vPermissionOriginalDisplay?: string;
  _vPermissionSkipUpdates?: boolean;
  _vPermissionParent?: Node | null;
  _vPermissionNextSibling?: Node | null;
  _vPermissionComment?: Comment | null;
}

/**
 * Evaluate permission and update element visibility/existence
 */
async function evaluateAndUpdate(
  el: PermissionElement,
  value: any,
  modifiers: Record<string, boolean> | Partial<Record<string, boolean>>,
  arg?: string,
): Promise<void> {
  let allowed = false;
  try {
    allowed = await hasPermission(value);
    logDebug(
      `Evaluated permission ${JSON.stringify(value)}: ${
        allowed ? "ALLOWED" : "DENIED"
      }`,
    );
  } catch (e) {
    console.error("[v-permission] Permission evaluation failed:", e);
    allowed = false;
  }

  if (allowed) {
    // Restore element if it was removed
    if (el._vPermissionComment) {
      const comment = el._vPermissionComment;
      const parent = el._vPermissionParent;
      if (parent && !el.parentNode) {
        parent.insertBefore(el, comment);
        comment.remove();
      }
      el._vPermissionComment = undefined;
    }
    // Restore display
    if (arg === "show" || modifiers.show) {
      el.style.display = el._vPermissionOriginalDisplay || "";
      logDebug(`Restoring display to: ${el._vPermissionOriginalDisplay}`);
    }
  } else {
    if (arg === "show" || modifiers.show) {
      // Hide but keep in DOM
      el.style.display = "none";
      logDebug("Hiding with display:none");
    } else {
      // Remove from DOM
      if (el.parentNode && !el._vPermissionComment) {
        const comment = document.createComment("v-permission");
        el._vPermissionParent = el.parentNode;
        el._vPermissionNextSibling = el.nextSibling;
        el._vPermissionComment = comment;
        el.replaceWith(comment);
        logDebug("Removed element from DOM");
      }
    }
  }
}

export const vPermission = {
  mounted(el: PermissionElement, binding: DirectiveBinding) {
    logDebug("mounted called with value:", binding.value);
    // binding.value might be a Ref, unwrap it
    let value = binding.value;
    let isValueRef = false;
    if (isRef(value)) {
      isValueRef = true;
      value = value.value;
    }
    const { modifiers, arg } = binding;

    // Store the Ref or raw value for later use in updated hook
    (el as any)._vPermissionValueRef = isValueRef ? binding.value : null;

    // Capture original display - try computed style first for CSS-set values
    let originalDisplay: string;
    try {
      const computed = window.getComputedStyle(el);
      originalDisplay = computed.display || el.style.display || "";
    } catch {
      originalDisplay = el.style.display || "";
    }
    el._vPermissionOriginalDisplay = originalDisplay;

    if (modifiers.once) {
      el._vPermissionSkipUpdates = true;
    }

    // Try synchronous check first (permissions are already loaded from plugin)
    const syncResult = checkPermissionSync(value);
    logDebug("syncResult:", syncResult, "value:", value);

    // Apply synchronous result immediately
    if (!syncResult && !(arg === "show" || modifiers.show)) {
      // Permission denied and not using show modifier, remove from DOM immediately
      if (el.parentNode) {
        const comment = document.createComment("v-permission");
        el._vPermissionParent = el.parentNode;
        el._vPermissionNextSibling = el.nextSibling;
        el._vPermissionComment = comment;
        // Replace element with comment atomically
        el.replaceWith(comment);
        logDebug("Removed element from DOM (sync)");
      }
    } else if (!syncResult && (arg === "show" || modifiers.show)) {
      // Permission denied and using show modifier, hide with CSS
      el.style.display = "none";
      logDebug("Hiding with display:none (sync)");
    }

    logDebug(
      `Mounted v-permission => ${JSON.stringify(value)} (sync: ${
        syncResult ? "ALLOWED" : "DENIED"
      })`,
    );
  },

  updated(el: PermissionElement, binding: DirectiveBinding) {
    // Unwrap Ref values - IMPORTANT: Check if binding.value IS a Ref object
    let value = binding.value;
    let oldValue = binding.oldValue;

    // If stored value was a Ref, use it to get current value
    const storedRef = (el as any)._vPermissionValueRef;
    if (storedRef && isRef(storedRef)) {
      value = storedRef.value;
      oldValue = binding.oldValue; // oldValue might also be a Ref
    } else if (isRef(value)) {
      value = value.value;
    }

    if (isRef(oldValue)) {
      oldValue = oldValue.value;
    }
    const { modifiers, arg } = binding;

    if (el._vPermissionSkipUpdates) return;

    // Check if binding value changed
    const valueChanged = JSON.stringify(value) !== JSON.stringify(oldValue);

    // Re-evaluate if binding changed OR if this is a component re-render (not lazy)
    if (valueChanged || (!valueChanged && !modifiers.lazy)) {
      // Capture new original display if element is in DOM
      if (el.parentNode && valueChanged) {
        try {
          const computed = window.getComputedStyle(el);
          const newDisplay = computed.display || el.style.display || "";
          el._vPermissionOriginalDisplay = newDisplay;
        } catch {
          el._vPermissionOriginalDisplay = el.style.display || "";
        }
      }

      // Use synchronous check first for immediate updates (matches mount behavior)
      const syncResult = checkPermissionSync(value);

      // Apply synchronous result immediately
      if (!syncResult && !(arg === "show" || modifiers.show)) {
        // Permission denied and not using show modifier, remove from DOM immediately
        if (el.parentNode && !el._vPermissionComment) {
          const comment = document.createComment("v-permission");
          el._vPermissionParent = el.parentNode;
          el._vPermissionNextSibling = el.nextSibling;
          el._vPermissionComment = comment;
          el.replaceWith(comment);
          logDebug("Removed element from DOM (sync update)");
        }
      } else if (!syncResult && (arg === "show" || modifiers.show)) {
        // Permission denied and using show modifier, hide with CSS
        el.style.display = "none";
        logDebug("Hiding with display:none (sync update)");
      } else if (syncResult) {
        // Permission granted - restore element/display
        if (el._vPermissionComment) {
          const comment = el._vPermissionComment;
          const parent = el._vPermissionParent;
          if (parent && !el.parentNode) {
            comment.replaceWith(el);
          }
          el._vPermissionComment = undefined;
        }
        // Restore display
        if (arg === "show" || modifiers.show) {
          el.style.display = el._vPermissionOriginalDisplay || "";
          logDebug(`Restoring display to: ${el._vPermissionOriginalDisplay}`);
        }
      }

      logDebug(
        `Updated v-permission => ${JSON.stringify(value)} : ${
          valueChanged ? "binding changed" : "component re-render"
        } (sync: ${syncResult ? "ALLOWED" : "DENIED"})`,
      );

      // Trigger async evaluation in background for cache and future reference
      evaluateAndUpdate(el, value, modifiers, arg).catch((e) => {
        console.error("[v-permission] Update evaluation failed:", e);
      });
    }
  },

  unmounted(el: PermissionElement) {
    // Restore element if it was removed
    if (el._vPermissionComment) {
      const comment = el._vPermissionComment;
      comment.remove();
    }
    delete el._vPermissionOriginalDisplay;
    delete el._vPermissionSkipUpdates;
    delete el._vPermissionParent;
    delete el._vPermissionNextSibling;
    delete el._vPermissionComment;
  },
};

export {};
