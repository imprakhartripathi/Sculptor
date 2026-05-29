import type { PackageDefinition, PackageToken } from "./types.js";
import { getPackageDefinition } from "./decorators.js";

export interface ResolvedPackageNode {
  token: PackageToken;
  definition: PackageDefinition;
}

export interface PackageGraphResult {
  ordered: ResolvedPackageNode[];
  packagesByName: Map<string, ResolvedPackageNode>;
}

const getPackageName = (definition: PackageDefinition): string => definition.name;

export const resolvePackageGraph = (packages: PackageToken[]): PackageGraphResult => {
  const ordered: ResolvedPackageNode[] = [];
  const packagesByName = new Map<string, ResolvedPackageNode>();
  const visiting = new Set<PackageToken>();
  const visited = new Set<PackageToken>();

  const visit = (token: PackageToken): void => {
    if (visited.has(token)) {
      return;
    }

    if (visiting.has(token)) {
      const definition = getPackageDefinition(token);
      const name = definition?.name ?? token.name ?? "UnknownPackage";
      throw new Error(`Circular package composition detected at "${name}".`);
    }

    const definition = getPackageDefinition(token);

    if (!definition) {
      throw new Error(`Package "${token.name || "AnonymousPackage"}" is missing @Package().`);
    }

    visiting.add(token);

    for (const imported of definition.imports ?? []) {
      visit(imported);
    }

    visiting.delete(token);
    visited.add(token);

    const node: ResolvedPackageNode = { token, definition };
    ordered.push(node);
    packagesByName.set(getPackageName(definition), node);
  };

  for (const token of packages) {
    visit(token);
  }

  return { ordered, packagesByName };
};
