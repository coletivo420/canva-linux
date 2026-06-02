import {
  calculateSourceHash,
  collectSourceHashFiles,
  SOURCE_HASH_ALGORITHM,
} from "../../canva-linux/source-hash.js";

export const C420UI_SOURCE_HASH_ALGORITHM = SOURCE_HASH_ALGORITHM;

export const C420UI_SOURCE_HASH_INPUTS = [
  "build-resources/c420ui/src",
  "build-resources/c420ui/scripts",
  "build-resources/c420ui/host",
  "build-resources/c420ui/operations",
  "build-resources/c420ui/checks",
  "build-resources/c420ui/bootstrap",
  "build-resources/c420ui/types",
  "build-resources/c420ui/package.json",
] as const;

export const C420UI_SOURCE_HASH_IGNORES = [
  "build-resources/c420ui/bootstrap/generated",
] as const;

export function collectC420UISourceHashFiles(
  rootDir: string,
  inputs: readonly string[] = C420UI_SOURCE_HASH_INPUTS,
): string[] {
  return collectSourceHashFiles(rootDir, inputs, C420UI_SOURCE_HASH_IGNORES);
}

export function calculateC420UISourceHash(
  rootDir: string,
  inputs: readonly string[] = C420UI_SOURCE_HASH_INPUTS,
): string {
  return calculateSourceHash(rootDir, inputs, C420UI_SOURCE_HASH_IGNORES);
}

export const C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM = C420UI_SOURCE_HASH_ALGORITHM;
export const C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS = C420UI_SOURCE_HASH_INPUTS;
export const collectC420UIBootstrapSourceHashFiles = collectC420UISourceHashFiles;
export const calculateC420UIBootstrapSourceHash = calculateC420UISourceHash;
