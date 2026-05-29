import fs from "node:fs";
import path from "node:path";

import { loadConfig } from "@sculptor/config";

import { loadPackageRegistry } from "./package-registry.js";

const cliVersion = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")
) as { version?: string };

const safeLoadConfig = (rootDir: string): { srcRoot: string; routingStyle: string } => {
  try {
    const config = loadConfig(rootDir);
    return {
      srcRoot: String(config.framework.project?.srcRoot ?? "src"),
      routingStyle: String(config.framework.routing?.style ?? "decorator")
    };
  } catch {
    return {
      srcRoot: "src",
      routingStyle: "decorator"
    };
  }
};

const safeLoadPackages = (rootDir: string): string[] => {
  try {
    return Object.values(loadPackageRegistry(rootDir).packages)
      .map((record) => record.name)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
};

const buildPackageList = (packages: string[]): string =>
  packages.length > 0 ? packages.map((name) => `- \`${name}\``).join("\n") : "- _none detected_";

export const buildAgentsMarkdown = (rootDir: string): string => {
  const { srcRoot, routingStyle } = safeLoadConfig(rootDir);
  const packages = safeLoadPackages(rootDir);
  const version = cliVersion.version ?? "0.0.0";

  return `# AGENTS.md

Sculptor CLI \`v${version}\`

## Working Rules

- Exact package names only. Do not singularize or pluralize package identities.
- Treat package index files as the package contract.
- Update generated sections only when markers exist.
- Keep runtime composition explicit and scanner-friendly.
- Prefer warnings and diagnostics over silent mutation.

## Package Architecture

- Project src root: \`${srcRoot}\`
- Routing style: \`${routingStyle}\`
- Package registry artifact: \`sculptor.packages.json\`
- Package index source of truth: \`index.ts\` inside each package
- Generated markers: \`[sculptor:imports:start]\`, \`[sculptor:exports:start]\`, \`[sculptor:package:start]\`

## DI Conventions

- Use \`@Service()\`, \`@Repository()\`, \`@Middleware()\`, and \`@AutoInject()\`.
- Injection is explicit only.
- Constructor injection and property injection are both supported.
- Avoid hidden autowiring or token guessing.

## Registry Conventions

- \`sc sync\` validates registry state and keeps \`sculptor.packages.json\` current.
- \`sc ls\` and \`sc pkg\` should reflect exact stored package names.
- \`sc doctor\` is the calm diagnostics entrypoint.
- \`sc update\` only updates \`@sculptor/cli\`.

## Generator Conventions

- Generators must preserve manual code outside generated markers.
- Package generation should use exact names and deterministic paths.
- Use the configured src root unless an explicit \`in\` path is supplied.

## Runtime Conventions

- Keep global registry composition thin.
- Flatten package composition internally.
- Preserve compatibility with legacy flat registries during migration.

## CLI Conventions

- \`sc agents\` writes this file.
- \`sc agents refresh\` regenerates this file.
- \`sc doctor\` reports diagnostics without mutating the project.
- \`sc update\` only manages the global CLI binary.

## Detected Packages

${buildPackageList(packages)}
`;
};

export const writeAgentsMarkdown = (rootDir: string): string => {
  const filePath = path.join(rootDir, "AGENTS.md");
  const content = buildAgentsMarkdown(rootDir);
  fs.writeFileSync(filePath, `${content}\n`, "utf8");
  return filePath;
};
