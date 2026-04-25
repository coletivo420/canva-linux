'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createWindowOpenPolicy } = require('../electron/main/window-open-policy');

function createPolicyWithStub(kindToReturn) {
  const calls = [];
  const classifyNavigationRequest = (input) => {
    calls.push(input);
    return { kind: kindToReturn, url: input.url };
  };

  const { classifyWindowOpenRequest } = createWindowOpenPolicy({
    classifyNavigationRequest,
  });

  return {
    calls,
    classifyWindowOpenRequest,
  };
}

test('maps oauth-popup into oauth category', () => {
  const { classifyWindowOpenRequest } = createPolicyWithStub('oauth-popup');

  const result = classifyWindowOpenRequest({
    url: 'https://accounts.google.com/o/oauth2/v2/auth',
    openerUrl: 'https://www.canva.com/login',
    disposition: 'new-window',
    frameName: 'google-auth',
  });

  assert.deepEqual(result, { category: 'oauth', kind: 'oauth-popup' });
});

test('maps internal-tab into tabs category', () => {
  const { classifyWindowOpenRequest } = createPolicyWithStub('internal-tab');

  const result = classifyWindowOpenRequest({
    url: 'https://www.canva.com/design',
    openerUrl: 'https://www.canva.com/',
    disposition: 'foreground-tab',
    frameName: '',
  });

  assert.deepEqual(result, { category: 'tabs', kind: 'internal-tab' });
});

test('maps about:blank into blank-window', () => {
  const { classifyWindowOpenRequest } = createPolicyWithStub('external');

  const result = classifyWindowOpenRequest({
    url: 'about:blank',
    openerUrl: 'https://www.canva.com/login',
    disposition: 'new-window',
    frameName: 'auth-popup',
  });

  assert.deepEqual(result, { category: 'tabs', kind: 'blank-window' });
});

test('maps about:srcdoc into blank-window', () => {
  const { classifyWindowOpenRequest } = createPolicyWithStub('external');

  const result = classifyWindowOpenRequest({
    url: 'about:srcdoc',
    openerUrl: 'https://www.canva.com/login',
    disposition: 'new-window',
    frameName: 'auth-popup',
  });

  assert.deepEqual(result, { category: 'tabs', kind: 'blank-window' });
});

test('maps blocked-external into tabs blocked-external', () => {
  const { classifyWindowOpenRequest } = createPolicyWithStub('blocked-external');

  const result = classifyWindowOpenRequest({
    url: 'javascript:alert(1)',
    openerUrl: 'https://www.canva.com/',
    disposition: 'foreground-tab',
    frameName: '',
  });

  assert.deepEqual(result, { category: 'tabs', kind: 'blocked-external' });
});

test('maps external into external-browser', () => {
  const { classifyWindowOpenRequest } = createPolicyWithStub('external');

  const result = classifyWindowOpenRequest({
    url: 'https://example.com',
    openerUrl: 'https://www.canva.com/',
    disposition: 'foreground-tab',
    frameName: '',
  });

  assert.deepEqual(result, { category: 'tabs', kind: 'external-browser' });
});

test('forwards the expected arguments to classifyNavigationRequest', () => {
  const { calls, classifyWindowOpenRequest } = createPolicyWithStub('external');

  const input = {
    url: 'https://example.com',
    openerUrl: 'https://www.canva.com/design',
    disposition: 'background-tab',
    frameName: 'share-popup',
  };

  classifyWindowOpenRequest(input);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], input);
});
