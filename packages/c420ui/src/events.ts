export type C420UIEventLevel = "debug" | "info" | "warning" | "error";

export type C420UIEvent = {
  type:
    | "workflow:start"
    | "workflow:finish"
    | "action:start"
    | "action:planned"
    | "action:finish"
    | "log"
    | "progress"
    | "sudo:request"
    | "sudo:finish"
    | "artifact:planned"
    | "artifact:created";
  timestamp: string;
  message: string;
  level?: C420UIEventLevel;
  workflowId?: string;
  actionId?: string;
  artifactId?: string;
  progress?: C420UIProgress;
  data?: Record<string, unknown>;
};

export type C420UIProgress = {
  current: number;
  total?: number;
  label?: string;
};

export type C420UIEventSink = (event: C420UIEvent) => void;

export function createC420UIEvent(
  event: Omit<C420UIEvent, "timestamp">,
): C420UIEvent {
  return {
    timestamp: new Date().toISOString(),
    ...event,
  };
}
