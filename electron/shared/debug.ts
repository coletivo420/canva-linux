type DebugLevel = 0 | 1 | 2;
type DebugEmitter = (category: string, args: unknown[]) => void;

function getDebugLevel(): DebugLevel {
  const explicitLevel = String(process?.env?.CANVA_DEBUG_LEVEL || "").trim();
  if (explicitLevel === "1" || explicitLevel === "2") {
    return Number(explicitLevel) as 1 | 2;
  }

  const raw = String(process?.env?.CANVA_DEBUG || "")
    .trim()
    .toLowerCase();
  if (raw === "1") return 1;
  if (raw === "2") return 2;

  return 0;
}

function isDebugEnabled(): boolean {
  return getDebugLevel() > 0;
}

function shouldLogDebugCategory(): boolean {
  return isDebugEnabled();
}

function isDebugCategoryEnabled(): boolean {
  return isDebugEnabled();
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

function createDebugTools({ emit }: { emit: DebugEmitter }) {
  const debugLevel = getDebugLevel();

  function debugEnabled(): boolean {
    return debugLevel > 0;
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
    debugLevel,
    debugSpec: String(debugLevel),
    debugEnabled,
    debugLog,
    getDebugLevel,
    isDebugEnabled,
    shouldLogDebugCategory,
    isDebugCategoryEnabled,
    normalizeDebugCategory,
  };
}

export {
  createDebugTools,
  getDebugLevel,
  isDebugEnabled,
  isDebugCategoryEnabled,
  normalizeDebugCategory,
  shouldLogDebugCategory,
};

module.exports = {
  createDebugTools,
  getDebugLevel,
  isDebugEnabled,
  isDebugCategoryEnabled,
  normalizeDebugCategory,
  shouldLogDebugCategory,
};
