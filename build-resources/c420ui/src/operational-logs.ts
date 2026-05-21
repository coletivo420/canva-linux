import type {
  C420UIEventLevel,
  c420uiLogEvent,
  c420uiLogSource,
} from "./events";

export type c420uiOperationalLogOptions = {
  source: c420uiLogSource;
  line: string;
  level?: C420UIEventLevel;
  redact?: boolean;
};

export type c420uiRedactionPattern = {
  id: string;
  pattern: RegExp;
  replacement: string;
};

export const c420uiDefaultRedactionPatterns: c420uiRedactionPattern[] = [
  {
    id: "token-assignment",
    pattern: /\b(token|secret|password|passwd|api[_-]?key)=([^\s]+)/gi,
    replacement: "$1=[redacted]",
  },
  {
    id: "bearer-token",
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]+/g,
    replacement: "Bearer [redacted]",
  },
];

export function redactC420UILogLine(line: string): string {
  return c420uiDefaultRedactionPatterns.reduce(
    (redactedLine, redaction) =>
      redactedLine.replace(redaction.pattern, redaction.replacement),
    line,
  );
}

export function createC420UIOperationalLogEvent(
  options: c420uiOperationalLogOptions,
): c420uiLogEvent {
  return {
    source: options.source,
    line:
      options.redact === false
        ? options.line
        : redactC420UILogLine(options.line),
    level: options.level,
    timestamp: new Date().toISOString(),
  };
}
