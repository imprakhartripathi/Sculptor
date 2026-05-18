import { spawnSync } from "node:child_process";

export interface RuntimeDependencyRecoveryContext {
  cwd: string;
  prompt: (question: string, defaultValue?: string) => Promise<string>;
  spawn: typeof spawnSync;
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}
