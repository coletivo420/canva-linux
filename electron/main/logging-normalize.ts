'use strict';

function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  try {
    const serialized = JSON.stringify(value, (_key: string, item: unknown): unknown => {
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

function normalizeLogArg(arg: unknown): string {
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

function normalizeArgs(args: unknown[] | Iterable<unknown> | unknown | null | undefined = []): string[] {
  if (args === null || args === undefined) {
    return [];
  }

  if (Array.isArray(args)) {
    return args.map(normalizeLogArg);
  }

  if (typeof args === 'object' && Symbol.iterator in args) {
    return Array.from(args as Iterable<unknown>).map(normalizeLogArg);
  }

  return [normalizeLogArg(args)];
}

function createLogSignature(args: unknown[] | Iterable<unknown> | unknown | null | undefined = []): string {
  return normalizeArgs(args).join(' ');
}

export {
  safeStringify,
  normalizeLogArg,
  normalizeArgs,
  createLogSignature,
};
