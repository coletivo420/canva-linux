'use strict';

function safeStringify(value) {
  const seen = new WeakSet();

  try {
    const serialized = JSON.stringify(value, (_key, item) => {
      if (typeof item === 'bigint') {
        return item.toString();
      }

      if (typeof item === 'function') {
        return `[Function:${item.name || 'anonymous'}]`;
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
    return `[Unserializable:${error?.message || String(error)}]`;
  }
}

function normalizeLogArg(arg) {
  if (arg === null) {
    return 'null';
  }

  if (arg === undefined) {
    return 'undefined';
  }

  if (typeof arg === 'string') {
    return arg;
  }

  if (typeof arg === 'number' || typeof arg === 'boolean') {
    return String(arg);
  }

  if (typeof arg === 'bigint') {
    return arg.toString();
  }

  if (typeof arg === 'symbol') {
    return arg.toString();
  }

  if (typeof arg === 'function') {
    return `[Function:${arg.name || 'anonymous'}]`;
  }

  if (arg instanceof Error) {
    return arg.stack || `${arg.name}: ${arg.message}`;
  }

  return safeStringify(arg);
}

function normalizeArgs(args = []) {
  if (args === null || args === undefined) {
    return [];
  }

  if (Array.isArray(args)) {
    return args.map(normalizeLogArg);
  }

  if (typeof args[Symbol.iterator] === 'function') {
    return Array.from(args).map(normalizeLogArg);
  }

  return [normalizeLogArg(args)];
}

function createLogSignature(args = []) {
  return normalizeArgs(args).join(' ');
}

module.exports = {
  safeStringify,
  normalizeLogArg,
  normalizeArgs,
  createLogSignature,
};
