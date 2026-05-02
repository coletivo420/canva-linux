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
  EyeDropperClass: unknown;
  installScalingPatch: (log: EyeDropperLog) => void;
  removeUi: () => void;
};

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
  const raw = process?.env?.CANVA_EYEDROPPER_IMPL;
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
  normalizeEyeDropperImplementation,
  resolveEyeDropperImplementation,
};

export type {
  EyeDropperImplementation,
  EyeDropperImplementationName,
};

module.exports = {
  normalizeEyeDropperImplementation,
  resolveEyeDropperImplementation,
};
