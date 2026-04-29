'use strict';
// @ts-check

/**
 * @returns {0 | 1 | 2}
 */
function getDebugLevel() {
  const explicitLevel = String(process?.env?.CANVA_DEBUG_LEVEL || '').trim();
  if (explicitLevel === '1' || explicitLevel === '2') {
    return /** @type {1 | 2} */ (Number(explicitLevel));
  }

  const raw = String(process?.env?.CANVA_DEBUG || '').trim().toLowerCase();
  if (raw === '1') return 1;
  if (raw === '2') return 2;

  return 0;
}

/**
 * @returns {boolean}
 */
function isDebugEnabled() {
  return getDebugLevel() > 0;
}

/**
 * @returns {boolean}
 */
function shouldLogDebugCategory() {
  return isDebugEnabled();
}

/**
 * @returns {boolean}
 */
function isDebugCategoryEnabled() {
  return isDebugEnabled();
}

/**
 * @param {string} [category]
 * @returns {string}
 */
function normalizeDebugCategory(category = 'app') {
  const raw = String(category || 'app')
    .trim()
    .toLowerCase()
    .replace(/\.+/g, ':')
    .replace(/\s+/g, '')
    .replace(/:+/g, ':')
    .replace(/^:+|:+$/g, '');

  return raw || 'app';
}

/**
 * @typedef {(category: string, args: unknown[]) => void} DebugEmitter
 */

/**
 * @param {{ emit: DebugEmitter }} options
 */
function createDebugTools({ emit }) {
  const debugLevel = getDebugLevel();

  /**
   * @returns {boolean}
   */
  function debugEnabled() {
    return debugLevel > 0;
  }

  /**
   * @param {string} category
   * @param {...unknown} args
   * @returns {boolean}
   */
  function debugLog(category, ...args) {
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

module.exports = {
  createDebugTools,
  getDebugLevel,
  isDebugEnabled,
  isDebugCategoryEnabled,
  normalizeDebugCategory,
  shouldLogDebugCategory,
};
