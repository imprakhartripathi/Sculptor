export type PackageManager = "npm" | "pnpm" | "yarn";

export const detectPackageManager = (): PackageManager => {
  const userAgent = process.env.npm_config_user_agent ?? "";

  if (userAgent.includes("pnpm")) {
    return "pnpm";
  }

  if (userAgent.includes("yarn")) {
    return "yarn";
  }

  return "npm";
};

export const globalInstallArgsFor = (
  packageManager: PackageManager,
  packages: string[]
): string[] => {
  if (packageManager === "pnpm") {
    return ["add", "-g", ...packages];
  }

  if (packageManager === "yarn") {
    return ["global", "add", ...packages];
  }

  return ["install", "-g", ...packages];
};
