export const c420uiExitCodes = {
  ok: 0,
  generalError: 1,
  invalidUsage: 2,
  contractViolation: 3,
  plannedAction: 4,
  unsupportedCapability: 5,
  missingAdapter: 6,
  requiresAuthorization: 7,
  executionFailed: 8,
} as const;

export type C420UIExitCodeName = keyof typeof c420uiExitCodes;
export type C420UIExitCode = (typeof c420uiExitCodes)[C420UIExitCodeName];
