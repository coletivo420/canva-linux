type DebugLevel = 0 | 1 | 2;
type DebugEmitter = (category: string, args: unknown[]) => void;

function normalizeDebugLevel(value: unknown): DebugLevel {
  return value === 1 || value === 2 ? value : 0;
}

function normalizeDebugCategory(category = "app"): string {
  const raw = String(category || "app")
    .trim()
    .toLowerCase()
    .replace(/\.+/g, ":")
    .replace(/\s+/g, "")
    .replace(/:+/g, ":")
    .replace(/^:+|:+$/g, "");

  return raw || "app";
}

function createDebugTools({
  emit,
  debugLevel,
}: {
  emit: DebugEmitter;
  debugLevel: DebugLevel;
}) {
  const normalizedDebugLevel = normalizeDebugLevel(debugLevel);

  function getDebugLevel(): DebugLevel {
    return normalizedDebugLevel;
  }

  function debugEnabled(): boolean {
    return normalizedDebugLevel > 0;
  }

  function isDebugEnabled(): boolean {
    return debugEnabled();
  }

  function shouldLogDebugCategory(): boolean {
    return debugEnabled();
  }

  function isDebugCategoryEnabled(): boolean {
    return debugEnabled();
  }

  function debugLog(category: string, ...args: unknown[]): boolean {
    const normalized = normalizeDebugCategory(category);

    if (!debugEnabled()) {
      return false;
    }

    emit(normalized, args);
    return true;
  }

  return {
    debugLevel: normalizedDebugLevel,
    debugSpec: String(normalizedDebugLevel),
    debugEnabled,
    debugLog,
    getDebugLevel,
    isDebugEnabled,
    shouldLogDebugCategory,
    isDebugCategoryEnabled,
    normalizeDebugCategory,
  };
}

export { createDebugTools, normalizeDebugCategory, normalizeDebugLevel };

module.exports = {
  createDebugTools,
  normalizeDebugCategory,
  normalizeDebugLevel,
};
