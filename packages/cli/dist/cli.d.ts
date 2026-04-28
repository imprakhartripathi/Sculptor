#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { type ScaffoldProjectMetadata } from "./scaffold.js";
type PromptFn = (question: string, defaultValue?: string) => Promise<string>;
export interface CliOptions {
    cwd?: string;
    prompt?: PromptFn;
    spawn?: typeof spawnSync;
    log?: (...args: unknown[]) => void;
    error?: (...args: unknown[]) => void;
}
declare const resolveProjectMetadata: (args: string[], cwd: string, prompt?: PromptFn) => Promise<ScaffoldProjectMetadata>;
export declare const runCli: (argv?: string[], options?: CliOptions) => Promise<void>;
export { resolveProjectMetadata };
