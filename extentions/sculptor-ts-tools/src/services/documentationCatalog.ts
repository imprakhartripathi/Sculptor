export type DocumentationId =
  | "getting-started"
  | "cli"
  | "core"
  | "router"
  | "config"
  | "runtime-config"
  | "paws"
  | "support-issues"
  | "support-discussions"
  | "support-discord";

export type DocumentationGroup = "documentation" | "support";

export interface DocumentationEntry {
  id: DocumentationId;
  label: string;
  description: string;
  filePath: string;
  group: DocumentationGroup;
}

export const documentationEntries: DocumentationEntry[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    description: "Project onboarding and first steps.",
    filePath: "getting-started.md",
    group: "documentation"
  },
  {
    id: "cli",
    label: "CLI",
    description: "Command-line workflow and package tooling.",
    filePath: "cli.md",
    group: "documentation"
  },
  {
    id: "core",
    label: "Core",
    description: "Runtime bootstrap, packages, and decorators.",
    filePath: "core.md",
    group: "documentation"
  },
  {
    id: "router",
    label: "Router",
    description: "Routing styles and controller/route support.",
    filePath: "router.md",
    group: "documentation"
  },
  {
    id: "config",
    label: "Config",
    description: "The Sculptor project configuration file.",
    filePath: "config.md",
    group: "documentation"
  },
  {
    id: "paws",
    label: "Paws",
    description: "Logging personality and runtime output.",
    filePath: "paws.md",
    group: "documentation"
  },
  {
    id: "runtime-config",
    label: "Runtime Config",
    description: "props.json runtime settings.",
    filePath: "runtime-config.md",
    group: "documentation"
  },
  {
    id: "support-issues",
    label: "GitHub Issues",
    description: "Report bugs and request features.",
    filePath: "support/issues.md",
    group: "support"
  },
  {
    id: "support-discussions",
    label: "GitHub Discussions",
    description: "Ask design and architecture questions.",
    filePath: "support/discussions.md",
    group: "support"
  },
  {
    id: "support-discord",
    label: "Discord",
    description: "Community support and quick questions.",
    filePath: "support/discord.md",
    group: "support"
  }
];

export const getDocumentationEntry = (id: DocumentationId): DocumentationEntry =>
  documentationEntries.find((entry) => entry.id === id) ?? documentationEntries[0]!;

export const getDocumentationEntriesByGroup = (group: DocumentationGroup): DocumentationEntry[] =>
  documentationEntries.filter((entry) => entry.group === group);
