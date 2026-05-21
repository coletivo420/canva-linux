export const c420uiExitCodes = {
  success: 0,
  generalError: 1,
  invalidUsage: 64,
  rootPolicyError: 64,
  plannedAction: 78,
  canceled: 130,
} as const;

export type C420UIExitCodeName = keyof typeof c420uiExitCodes;
export type C420UIExitCode = (typeof c420uiExitCodes)[C420UIExitCodeName];
