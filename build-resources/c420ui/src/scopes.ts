export const c420uiKnownActionScopes = ["user", "system", "auto"] as const;

export type c420uiKnownActionScope = (typeof c420uiKnownActionScopes)[number];

export type c420uiActionScope = c420uiKnownActionScope | string;

export function normalizeC420UIActionScope(
  scope: string | undefined,
): c420uiActionScope | undefined {
  const normalized = scope?.trim();
  return normalized || undefined;
}

export function isC420UIUserScope(scope: string | undefined): boolean {
  return normalizeC420UIActionScope(scope) === "user";
}

export function isC420UISystemScope(scope: string | undefined): boolean {
  return normalizeC420UIActionScope(scope) === "system";
}

export function isC420UIAutoScope(scope: string | undefined): boolean {
  return normalizeC420UIActionScope(scope) === "auto";
}
