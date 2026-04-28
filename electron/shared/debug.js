'use strict';

function getDebugLevel() {
  const explicitLevel = String(process.env.CANVA_DEBUG_LEVEL || '').trim();
  if (explicitLevel === '1' || explicitLevel === '2') {
    return Number(explicitLevel);
  }

  const raw = String(process.env.CANVA_DEBUG || '').trim().toLowerCase();
  if (raw === '1') return 1;
  if (raw === '2') return 2;

  return 0;
}

function isDebugEnabled() {
  return getDebugLevel() > 0;
}

function shouldLogDebugCategory() {
  return isDebugEnabled();
}

function isDebugCategoryEnabled() {
  return isDebugEnabled();
}

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

function createDebugTools({ emit }) {
  const debugLevel = getDebugLevel();

  function debugEnabled() {
    return debugLevel > 0;
  }

  function debugLog(category, ...args) {
    const normalized = normalizeDebugCategory(category);
    if (!debugEnabled()) return false;
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
