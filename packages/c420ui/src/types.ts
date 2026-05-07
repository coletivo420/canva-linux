export type C420UIBrandConfig = {
  name: string;
  version: string;
  logoLines: string[];
};

export type C420UIProjectConfig = {
  projectName: string;
  projectSubtitle: string;
  displayVersion: string;
  phase?: string;
  status?: string;
  logoLines: string[];
};

export type C420UIAction = {
  id: string;
  label: string;
  group: string;
  section: string;
  kind: "command" | "planned";
  description?: string;
  warning?: string;
  dangerous?: boolean;
  planned?: boolean;
  requiresRoot?: boolean;
};
