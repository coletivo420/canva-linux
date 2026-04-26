'use strict';

// Keep the main-process window-open policy isolated from index.js bootstrap so
// the policy can be unit-tested without loading the full Electron entrypoint.
function createWindowOpenPolicy({ classifyNavigationRequest }) {
  function classifyWindowOpenRequest({ url, openerUrl, disposition, frameName }) {
    const request = classifyNavigationRequest({ url, openerUrl, disposition, frameName });
    if (request.kind === 'oauth-popup') {
      return { category: 'oauth', kind: request.kind };
    }
    if (request.kind === 'internal-tab') {
      return { category: 'tabs', kind: request.kind };
    }
    if (!url || url === 'about:blank' || url === 'about:srcdoc') {
      return { category: 'tabs', kind: 'blank-window' };
    }
    if (request.kind === 'blocked-external') {
      return { category: 'tabs', kind: request.kind };
    }
    return { category: 'tabs', kind: 'external-browser' };
  }

  return {
    classifyWindowOpenRequest,
  };
}

module.exports = {
  createWindowOpenPolicy,
};
