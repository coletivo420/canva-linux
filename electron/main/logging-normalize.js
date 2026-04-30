'use strict';
// @ts-check

/**
 * @param {unknown} value
 * @returns {string}
 */
function safeStringify(value) {
  const seen = new WeakSet();

  try {
    const serialized = JSON.stringify(value, (_key, item) => {
      if (typeof item === 'bigint' || typeof item === 'symbol') {
        return item.toString();
      }

      if (typeof item === 'function') {
        return `[Function:${item.name || 'anonymous'}]`;
      }

      if (item instanceof Error) {
        return { name: item.name, message: item.message, stack: item.stack };
      }

      if (typeof item === 'object' && item !== null) {
        if (seen.has(item)) {
          return '[Circular]';
        }

        seen.add(item);
      }

      return item;
    });

    return serialized ?? '[Unserializable:undefined-json-result]';
  } catch (error) {
    return `[Unserializable:${error instanceof Error ? error.message : String(error)}]`;
  }
}

/**
 * @param {unknown} arg
 * @returns {string}
 */
function normalizeLogArg(arg) {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';

  if (typeof arg === 'string') return arg;
  if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
  if (typeof arg === 'bigint') return arg.toString();
  if (typeof arg === 'symbol') return arg.toString();

  if (typeof arg === 'function') {
    return `[Function:${arg.name || 'anonymous'}]`;
  }

  if (arg instanceof Error) {
    return arg.stack || `${arg.name}: ${arg.message}`;
  }

  return safeStringify(arg);
}

/**
 * @param {unknown[] | Iterable<unknown> | unknown | null | undefined} args
 * @returns {string[]}
 */
function normalizeArgs(args = []) {
  if (args === null || args === undefined) {
    return [];
  }

  if (Array.isArray(args)) {
    return args.map(normalizeLogArg);
  }

  if (typeof args === 'object' && Symbol.iterator in args) {
    return Array.from(/** @type {Iterable<unknown>} */ (args)).map(normalizeLogArg);
  }

  return [normalizeLogArg(args)];
}

/**
 * @param {unknown[] | Iterable<unknown> | unknown | null | undefined} args
 * @returns {string}
 */
function createLogSignature(args = []) {
  return normalizeArgs(args).join(' ');
}

module.exports = {
  safeStringify,
  normalizeLogArg,
  normalizeArgs,
  createLogSignature,
};
