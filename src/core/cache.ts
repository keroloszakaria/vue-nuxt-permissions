const permissionCache = new Map<
  string,
  { value: boolean; timestamp: number }
>();
const CACHE_MAX_SIZE = 1000;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getCachedPermission = (key: string): boolean | null => {
  const cached = permissionCache.get(key);
  if (!cached) return null;

  // Check TTL
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    permissionCache.delete(key);
    return null;
  }

  return cached.value;
};

export const setCachedPermission = (key: string, value: boolean) => {
  // Prevent unbounded growth
  if (permissionCache.size >= CACHE_MAX_SIZE) {
    // Remove oldest entry
    const oldestKey = permissionCache.keys().next().value as string | undefined;
    if (oldestKey) {
      permissionCache.delete(oldestKey);
    }
  }

  permissionCache.set(key, {
    value,
    timestamp: Date.now(),
  });
};

export const clearPermissionCache = () => permissionCache.clear();

export const invalidateCache = () => {
  // Clear expired entries periodically
  const now = Date.now();
  for (const [key, cached] of permissionCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      permissionCache.delete(key);
    }
  }
};
