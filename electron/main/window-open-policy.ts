export type NavigationKind =
  | "oauth-popup"
  | "internal-tab"
  | "blocked-external"
  | "external";
export type WindowOpenCategory = "oauth" | "tabs";
export type WindowOpenKind =
  | "oauth-popup"
  | "internal-tab"
  | "blank-window"
  | "blocked-external"
  | "external-browser";
export type WindowOpenInput = {
  url?: string;
  openerUrl?: string;
  disposition?: string;
  frameName?: string;
};
export type NavigationClassification = {
  kind: NavigationKind;
  url?: string;
};
export type ClassifyNavigationRequest = (
  input: WindowOpenInput,
) => NavigationClassification;
export type WindowOpenClassification = {
  category: WindowOpenCategory;
  kind: WindowOpenKind;
};

/**
 * @typedef {'oauth-popup' | 'internal-tab' | 'blocked-external' | 'external'} NavigationKind
 */

/**
 * @typedef {'oauth' | 'tabs'} WindowOpenCategory
 */

/**
 * @typedef {'oauth-popup' | 'internal-tab' | 'blank-window' | 'blocked-external' | 'external-browser'} WindowOpenKind
 */

/**
 * @typedef {{
 *   url?: string;
 *   openerUrl?: string;
 *   disposition?: string;
 *   frameName?: string;
 * }} WindowOpenInput
 */

/**
 * @typedef {{
 *   kind: NavigationKind;
 *   url?: string;
 * }} NavigationClassification
 */

/**
 * @typedef {(input: WindowOpenInput) => NavigationClassification} ClassifyNavigationRequest
 */

/**
 * @typedef {{
 *   category: WindowOpenCategory;
 *   kind: WindowOpenKind;
 * }} WindowOpenClassification
 */

// Keep the main-process window-open policy isolated from index.js bootstrap so
// the policy can be unit-tested without loading the full Electron entrypoint.
/**
 * @param {{ classifyNavigationRequest: ClassifyNavigationRequest }} options
 */
export function createWindowOpenPolicy({
  classifyNavigationRequest,
}: {
  classifyNavigationRequest: ClassifyNavigationRequest;
}) {
  /**
   * @param {WindowOpenInput} input
   * @returns {WindowOpenClassification}
   */
  function classifyWindowOpenRequest({
    url = "",
    openerUrl = "",
    disposition = "",
    frameName = "",
  }: WindowOpenInput): WindowOpenClassification {
    const request = classifyNavigationRequest({
      url,
      openerUrl,
      disposition,
      frameName,
    });
    if (request.kind === "oauth-popup") {
      return { category: "oauth", kind: request.kind };
    }
    if (request.kind === "internal-tab") {
      return { category: "tabs", kind: request.kind };
    }
    if (!url || url === "about:blank" || url === "about:srcdoc") {
      return { category: "tabs", kind: "blank-window" };
    }
    if (request.kind === "blocked-external") {
      return { category: "tabs", kind: request.kind };
    }
    return { category: "tabs", kind: "external-browser" };
  }

  return {
    classifyWindowOpenRequest,
  };
}
