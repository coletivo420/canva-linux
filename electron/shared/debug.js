'use strict';

const DEBUG_CATEGORY_ALIASES = {
  drag: 'dnd',
  toolbar: 'tabs:toolbar',
  'tabs-toolbar': 'tabs:toolbar',
  'toolbar-tabs': 'tabs:toolbar',
  'tabs-state': 'tabs:state',
  state: 'tabs:state',
  'tab-state': 'tabs:state',
  'tabs-nav': 'tabs:navigation',
  'tab-nav': 'tabs:navigation',
  'tabs-view': 'tabs:view',
  'tab-view': 'tabs:view',
  bridge: 'eyedropper:bridge',
  'eyedropper-bridge': 'eyedropper:bridge',
  'eyedropper-flow': 'eyedropper:flow',
  'eyedropper-wrapper': 'eyedropper:wrapper',
  routing: 'eyedropper:routing',
  capture: 'eyedropper:routing',
  'eyedropper-routing': 'eyedropper:routing',
  'eyedropper-capture': 'eyedropper:routing',
  'eyedropper-library': 'eyedropper:library',
  'eyedropper-lib': 'eyedropper:library',
};

function normalizeDebugCategory(category = 'app') {
  const raw = String(category || 'app')
    .trim()
    .toLowerCase()
    .replace(/\.+/g, ':')
    .replace(/\s+/g, '')
    .replace(/:+/g, ':')
    .replace(/^:+|:+$/g, '');
  return DEBUG_CATEGORY_ALIASES[raw] || raw || 'app';
}

function matchesDebugToken(token, category) {
  if (!token || !category) return false;
  if (token === 'all' || token === '*') return true;
  if (token === category) return true;

  // Parent categories enable every child category:
  // `tabs` matches `tabs:toolbar`, `tabs:state`, etc.
  if (category.startsWith(`${token}:`)) return true;

  // Allow suffix wildcard filters such as `tabs:*`.
  if (token.endsWith('*')) {
    const prefix = token.slice(0, -1);
    return prefix ? category.startsWith(prefix) : true;
  }

  return false;
}

function createDebugTools({ spec, emit }) {
  const debugSpec = String(spec || '').trim();
  const debugTokens = new Set(
    debugSpec
      .split(',')
      .map((item) => normalizeDebugCategory(item))
      .filter(Boolean)
  );

  function debugEnabled(category = 'app') {
    const normalizedSpec = debugSpec.toLowerCase();
    if (!normalizedSpec || normalizedSpec === '0' || normalizedSpec === 'false') {
      return false;
    }
    const normalized = normalizeDebugCategory(category);
    if (['1', 'true', 'all', '*'].includes(normalizedSpec)) {
      return true;
    }
    for (const token of debugTokens) {
      if (matchesDebugToken(token, normalized)) {
        return true;
      }
    }
    return false;
  }

  function debugLog(category, ...args) {
    const normalized = normalizeDebugCategory(category);
    if (!debugEnabled(normalized)) return false;
    emit(normalized, args);
    return true;
  }

  return {
    debugSpec,
    debugEnabled,
    debugLog,
    matchesDebugToken,
    normalizeDebugCategory,
  };
}

module.exports = {
  createDebugTools,
  matchesDebugToken,
  normalizeDebugCategory,
};
