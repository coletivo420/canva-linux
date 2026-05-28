// @ts-nocheck
"use strict";

// @ts-check

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const {
  classifyWindowOpenRequest,
  detectCanvaOAuthCallback,
  extractHostname,
  isBlankPopupUrl,
  isCanvaAuthUrl,
  isCanvaUrl,
  isOAuthProviderUrl,
  isSafeExternalUrl,
  shouldGrantRemotePermission,
} = loadRuntimeModule("shared/navigation");

test("detects Canva URLs", () => {
  assert.equal(isCanvaUrl("https://www.canva.com/design"), true);
  assert.equal(isCanvaUrl("https://evil.com"), false);
});

test("detects OAuth provider URLs", () => {
  assert.equal(
    isOAuthProviderUrl("https://accounts.google.com/o/oauth2/v2/auth"),
    true,
  );
  assert.equal(
    isOAuthProviderUrl("https://login.microsoftonline.com/common/oauth2"),
    true,
  );
  assert.equal(isOAuthProviderUrl("https://example.com/login"), false);
});

test("detects Canva OAuth callbacks", () => {
  assert.equal(
    detectCanvaOAuthCallback("https://www.canva.com/oauth/authorized/foo"),
    "authorized",
  );
  assert.equal(
    detectCanvaOAuthCallback("https://www.canva.com/oauth/foo"),
    "oauth",
  );
  assert.equal(detectCanvaOAuthCallback("https://www.canva.com/design"), null);
});

test("classifies OAuth provider as oauth-popup", () => {
  assert.deepEqual(
    classifyWindowOpenRequest({
      url: "https://accounts.google.com/o/oauth2/v2/auth",
      openerUrl: "https://www.canva.com/login",
      disposition: "new-window",
      frameName: "google-auth",
    }),
    {
      kind: "oauth-popup",
      url: "https://accounts.google.com/o/oauth2/v2/auth",
    },
  );
});

test("classifies Canva URL as internal-tab", () => {
  assert.deepEqual(
    classifyWindowOpenRequest({
      url: "https://www.canva.com/design",
      openerUrl: "https://www.canva.com/",
      disposition: "foreground-tab",
      frameName: "",
    }),
    {
      kind: "internal-tab",
      url: "https://www.canva.com/design",
    },
  );
});

test("blocks unsafe external protocols", () => {
  assert.deepEqual(
    classifyWindowOpenRequest({
      url: "javascript:alert(1)",
      openerUrl: "https://www.canva.com/",
      disposition: "foreground-tab",
      frameName: "",
    }),
    {
      kind: "blocked-external",
      url: "javascript:alert(1)",
    },
  );
});

test("allows only HTTPS external protocol", () => {
  assert.equal(isSafeExternalUrl("https://example.com"), true);
  assert.equal(isSafeExternalUrl("http://example.com"), false);
  assert.equal(isSafeExternalUrl("mailto:test@example.com"), false);
  assert.equal(isSafeExternalUrl("file:///etc/passwd"), false);
});

test("detects blank popup URLs", () => {
  assert.equal(isBlankPopupUrl(""), true);
  assert.equal(isBlankPopupUrl("about:blank"), true);
  assert.equal(isBlankPopupUrl("about:srcdoc"), true);
});

test("extracts hostnames safely", () => {
  assert.equal(
    extractHostname("https://www.canva.com/design"),
    "www.canva.com",
  );
  assert.equal(extractHostname("not a url"), "");
});

test("grants trusted Canva media permission", () => {
  assert.equal(
    shouldGrantRemotePermission("media", "https://www.canva.com/", {}),
    true,
  );
});

test("denies untrusted media permission", () => {
  assert.equal(
    shouldGrantRemotePermission("media", "https://example.com/", {}),
    false,
  );
});

test("denies OAuth provider media permission", () => {
  assert.equal(
    shouldGrantRemotePermission("media", "https://accounts.google.com/", {}),
    false,
  );
});

test("denies OAuth provider display capture permission", () => {
  assert.equal(
    shouldGrantRemotePermission(
      "display-capture",
      "https://accounts.google.com/",
      {},
    ),
    false,
  );
});

test("denies OAuth provider clipboard read permission", () => {
  assert.equal(
    shouldGrantRemotePermission(
      "clipboard-read",
      "https://accounts.google.com/",
      {},
    ),
    false,
  );
});

test("detects Canva auth URLs", () => {
  assert.equal(isCanvaAuthUrl("https://www.canva.com/login"), true);
  assert.equal(isCanvaAuthUrl("https://www.canva.com/design"), false);
});
