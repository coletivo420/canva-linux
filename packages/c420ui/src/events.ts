export type c420uiOperationalLogSource =
  | "stdout"
  | "stderr"
  | "system"
  | "build"
  | "package"
  | "install"
  | "uninstall"
  | "purge"
  | "release"
  | "validation"
  | "action";

export type c420uiLogSource = c420uiOperationalLogSource;

export type c420uiLogEvent = {
  source: c420uiLogSource;
  line: string;
  timestamp?: string;
};

export type c420uiProgressState =
  | "idle"
  | "running"
  | "success"
  | "warning"
  | "failed"
  | "canceled";

export type c420uiProgressEvent = {
  state: c420uiProgressState;
  percent?: number;
  label?: string;
};

export type C420UILogSource = c420uiLogSource;
export type C420UILogEvent = c420uiLogEvent;
export type C420UIProgressState = c420uiProgressState;
export type C420UIProgressEvent = c420uiProgressEvent;
export type C420UIEventLevel = "debug" | "info" | "warning" | "error";

export type C420UIProgress = {
  current: number;
  total?: number;
  label?: string;
};

export type C420UIEvent =
  | (c420uiLogEvent & { type: "log"; level?: C420UIEventLevel })
  | (c420uiProgressEvent & { type: "progress"; timestamp?: string })
  | {
      type:
        | "workflow:start"
        | "workflow:finish"
        | "action:start"
        | "action:planned"
        | "action:finish"
        | "sudo:request"
        | "sudo:finish"
        | "artifact:planned"
        | "artifact:created";
      timestamp?: string;
      message: string;
      level?: C420UIEventLevel;
      workflowId?: string;
      actionId?: string;
      artifactId?: string;
      progress?: C420UIProgress;
      data?: Record<string, unknown>;
    };

export type C420UIEventSink = (event: C420UIEvent) => void;

export function createC420UIEvent(event: C420UIEvent): C420UIEvent {
  return {
    timestamp: new Date().toISOString(),
    ...event,
  };
}
