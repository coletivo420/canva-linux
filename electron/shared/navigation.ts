'use strict';

type NavigationKind = 'oauth-popup' | 'internal-tab' | 'blocked-external' | 'external';
type CanvaOAuthCallbackType = 'authorized' | 'oauth';

type NavigationRequestInput = {
  url?: string;
  openerUrl?: string;
  disposition?: string;
  frameName?: string;
};

type NavigationClassification = {
  kind: NavigationKind;
  url?: string;
};

type PermissionDetails = {
  requestingUrl?: string;
};

const INTERNAL_HOST_RE = /(?:^|\.)canva\.com$/i;
const OAUTH_PROVIDER_HOSTS = [
  /^(?:accounts\.google\.com|accounts\.google\.com\.br|accounts\.youtube\.com)$/i,
  /^(?:facebook\.com|www\.facebook\.com|m\.facebook\.com)$/i,
  /^appleid\.apple\.com$/i,
  /^(?:login\.microsoftonline\.com|login\.live\.com|account\.live\.com)$/i,
];
const AUTH_PATH_RE = /\/(?:login|signup|register|oauth|sso|auth|signin|account)(?:[/?#]|$)/i;
const CANVA_AUTH_HINT_RE = /(?:google|facebook|apple|microsoft|oauth|sso|signup|login|continue)/i;
const CANVA_OAUTH_AUTHORIZED_RE = /^\/oauth\/authorized(?:\/|$)/i;
const CANVA_OAUTH_RE = /^\/oauth(?:\/|$)/i;
const EXTERNAL_PROTOCOL_ALLOWLIST = new Set(['https:', 'http:', 'mailto:']);

function isCanvaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && INTERNAL_HOST_RE.test(parsed.hostname);
  } catch {
    return false;
  }
}

function isOAuthProviderUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && OAUTH_PROVIDER_HOSTS.some((re) => re.test(parsed.hostname));
  } catch {
    return false;
  }
}

function extractHostname(urlish: string): string {
  try {
    return new URL(urlish).hostname;
  } catch {
    return '';
  }
}

function shouldGrantRemotePermission(permission: string, origin: string, details: PermissionDetails = {}): boolean {
  const canvaTrusted = isCanvaUrl(origin) || isCanvaUrl(details.requestingUrl || '');

  if (!canvaTrusted) return false;

  switch (permission) {
    // Some trusted Canva flows still probe browser capture permissions, but
    // Canva Linux color picking must continue to resolve through CL-EyeDropper
    // instead of browser/native capture UI.
    case 'display-capture':
    case 'fullscreen':
    case 'media':
    case 'notifications':
    case 'pointerLock':
    case 'clipboard-sanitized-write':
    case 'clipboard-read':
      return true;
    case 'fileSystem':
      return isCanvaUrl(origin) || isCanvaUrl(details.requestingUrl || '');
    default:
      return false;
  }
}

function isCanvaAuthUrl(url: string): boolean {
  if (!isCanvaUrl(url)) return false;
  try {
    const parsed = new URL(url);
    if (AUTH_PATH_RE.test(parsed.pathname)) return true;
    const q = parsed.searchParams;
    return ['auth', 'oauth', 'provider', 'continue', 'redirect', 'redirect_uri', 'callback'].some((key) => q.has(key))
      || CANVA_AUTH_HINT_RE.test(parsed.pathname + parsed.search + parsed.hash);
  } catch {
    return false;
  }
}

function isCanvaOAuthAuthorizedCallback(url: string): boolean {
  if (!isCanvaUrl(url)) return false;
  try {
    return CANVA_OAUTH_AUTHORIZED_RE.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function isCanvaOAuthUrl(url: string): boolean {
  if (!isCanvaUrl(url)) return false;
  try {
    return CANVA_OAUTH_RE.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function shouldOpenInOauthPopup(url: string): boolean {
  return isOAuthProviderUrl(url) || isCanvaAuthUrl(url) || isCanvaOAuthUrl(url);
}

function detectCanvaOAuthCallback(url: string): CanvaOAuthCallbackType | null {
  if (isCanvaOAuthAuthorizedCallback(url)) return 'authorized';
  if (isCanvaOAuthUrl(url)) return 'oauth';
  return null;
}

function isBlankPopupUrl(url: string): boolean {
  return !url || url === 'about:blank' || url === 'about:srcdoc';
}

function isSafeExternalUrl(url: string): boolean {
  try {
    return EXTERNAL_PROTOCOL_ALLOWLIST.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

function shouldTreatAsOauthPopup({
  url = '',
  openerUrl = '',
  disposition = '',
  frameName = '',
}: NavigationRequestInput): boolean {
  if (shouldOpenInOauthPopup(url)) return true;
  if (isBlankPopupUrl(url) && isCanvaAuthUrl(openerUrl)) return true;
  if (isBlankPopupUrl(url) && frameName && /auth|oauth|login|signin|account|popup/i.test(frameName)) return true;
  if ((disposition === 'new-window' || disposition === 'foreground-tab') && isCanvaAuthUrl(openerUrl)) return true;
  return false;
}

function classifyWindowOpenRequest({
  url = '',
  openerUrl = '',
  disposition = '',
  frameName = '',
}: NavigationRequestInput): NavigationClassification {
  if (shouldTreatAsOauthPopup({ url, openerUrl, disposition, frameName })) {
    return { kind: 'oauth-popup', url };
  }
  if (isCanvaUrl(url)) {
    return { kind: 'internal-tab', url };
  }
  if (!isSafeExternalUrl(url)) {
    return { kind: 'blocked-external', url };
  }
  return { kind: 'external', url };
}

export {
  classifyWindowOpenRequest,
  detectCanvaOAuthCallback,
  extractHostname,
  isBlankPopupUrl,
  isCanvaAuthUrl,
  isOAuthProviderUrl,
  isCanvaUrl,
  isSafeExternalUrl,
  shouldGrantRemotePermission,
};

module.exports = {
  classifyWindowOpenRequest,
  detectCanvaOAuthCallback,
  extractHostname,
  isBlankPopupUrl,
  isCanvaAuthUrl,
  isOAuthProviderUrl,
  isCanvaUrl,
  isSafeExternalUrl,
  shouldGrantRemotePermission,
};
