'use strict';

const {
  CLEyeDropper,
  installClEyeDropperScalingPatch,
  removeClEyeDropperUi,
} = require('./cl-eyedropper/index');

const {
  LTCodeEyeDropper,
  installLtcodeScalingPatch,
  removeLtcodeUi,
} = require('./ltcode-eyedropper');

type EyeDropperLog = (category: string, ...args: unknown[]) => void;
type EyeDropperImplementationName = 'cl' | 'legacy';
type EyeDropperImplementation = {
  name: EyeDropperImplementationName;
  EyeDropperClass: new (options?: any) => any;
  installScalingPatch: (log: EyeDropperLog) => void;
  removeUi: () => void;
};

const EYE_DROPPER_IMPLEMENTATION_ARGUMENT = '--canva-eyedropper-impl=';

function readEyeDropperImplementationArgument(argv: unknown): string | undefined {
  if (!Array.isArray(argv)) return undefined;

  for (const arg of argv) {
    if (typeof arg !== 'string') continue;
    if (arg.startsWith(EYE_DROPPER_IMPLEMENTATION_ARGUMENT)) {
      return arg.slice(EYE_DROPPER_IMPLEMENTATION_ARGUMENT.length);
    }
  }

  return undefined;
}

function normalizeEyeDropperImplementation(value: unknown): EyeDropperImplementationName {
  const raw = String(value || '').trim().toLowerCase();

  if (!raw || raw === 'cl') return 'cl';
  if (raw === 'legacy' || raw === 'ltcode') return 'legacy';

  return 'cl';
}

function resolveEyeDropperImplementation({
  logEyeDropper,
}: {
  logEyeDropper: EyeDropperLog;
}): EyeDropperImplementation {
  const runtimeProcess = typeof process === 'undefined' ? undefined : process;
  const raw = readEyeDropperImplementationArgument(runtimeProcess?.argv);
  const selected = normalizeEyeDropperImplementation(raw);
  const normalizedRaw = String(raw || '').trim().toLowerCase();

  if (normalizedRaw && normalizedRaw !== 'cl' && normalizedRaw !== 'legacy' && normalizedRaw !== 'ltcode') {
    logEyeDropper('eyedropper:flow', 'implementation-invalid', normalizedRaw, 'fallback=cl');
  }

  if (selected === 'legacy') {
    logEyeDropper('eyedropper:flow', 'implementation-selected', 'legacy');
    return {
      name: 'legacy',
      EyeDropperClass: LTCodeEyeDropper,
      installScalingPatch: installLtcodeScalingPatch,
      removeUi: removeLtcodeUi,
    };
  }

  logEyeDropper('eyedropper:flow', 'implementation-selected', 'cl');
  return {
    name: 'cl',
    EyeDropperClass: CLEyeDropper,
    installScalingPatch: installClEyeDropperScalingPatch,
    removeUi: removeClEyeDropperUi,
  };
}

export {
  EYE_DROPPER_IMPLEMENTATION_ARGUMENT,
  normalizeEyeDropperImplementation,
  readEyeDropperImplementationArgument,
  resolveEyeDropperImplementation,
};

export type {
  EyeDropperImplementation,
  EyeDropperImplementationName,
};

module.exports = {
  EYE_DROPPER_IMPLEMENTATION_ARGUMENT,
  normalizeEyeDropperImplementation,
  readEyeDropperImplementationArgument,
  resolveEyeDropperImplementation,
};
