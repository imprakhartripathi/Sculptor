export type ScaffoldMode = "decorator" | "functional" | "hybrid";
export type DevServer = "tsx" | "nodemon";
export type GenerateKind = "controller" | "service" | "module" | "middleware" | "type" | "route";
export type TypeVariant = "type" | "interface" | "class" | "enum";
export type TestingFramework = "vitest";
export interface TestingMetadata {
    generate: boolean;
    framework: TestingFramework;
}
export interface ScaffoldProjectMetadata {
    appName: string;
    version: string;
    mode: ScaffoldMode;
    frameworkLock: boolean;
    devServer: DevServer;
    testing: TestingMetadata;
}
export declare const scaffoldProject: (metadata: ScaffoldProjectMetadata, targetDir: string) => void;
export declare const generateResourceFiles: (kind: GenerateKind, name: string, mode: ScaffoldMode, devServer?: DevServer, outputDir?: string, typeVariant?: TypeVariant, testingGenerate?: boolean) => Record<string, string>;
export declare const writeGeneratedFiles: (targetDir: string, files: Record<string, string>) => void;
export declare const readModeFromFlags: (flags: string[], fallback: ScaffoldMode) => ScaffoldMode;
export declare const parseGenerateMode: (mode: string | undefined, fallback: ScaffoldMode) => ScaffoldMode;
export declare const controllerHelp = "# Controller Generator\n\n## Usage\n\n```bash\nsc generate controller user\nsc g c user\n\nsc generate controller user in src/app/controllers\n\nsc g c user --functional\n```\n\n## Output\n\n- `controllers/*.controller.ts`\n- in functional mode, generates `routes/*.routes.ts` and `handlers/*.handler.ts`\n";
export declare const moduleHelp = "# Module Generator\n\n## Usage\n\n```bash\nsc generate module user\nsc g mo user\n```\n";
export declare const middlewareHelp = "# Middleware Generator\n\n## Usage\n\n```bash\nsc generate middleware auth\nsc g mw auth\n```\n";
export declare const typeHelp = "# Type Generator\n\n## Usage\n\n```bash\nsc generate type user\nsc g t user\nsc g t user -i\nsc g t user -c\nsc g t user -e\n```\n\n## Flags\n\n- `-i`, `-interface` => `*.interface.ts`\n- `-c`, `-class` => `*.class.ts`\n- `-e`, `-enum` => `*.enum.ts`\n- default => `*.type.ts`\n";
export declare const routeHelp = "# Route Generator\n\n## Usage\n\n```bash\nsc generate route user\nsc g r user\n```\n\n## Mode Guard\n\n- routers can only be scaffolded in functional or hybrid mode\n";
export declare const generateHelp = "# Generate\n\n## Usage\n\n```bash\nsc generate controller user\nsc generate service user\nsc generate module user\nsc generate middleware auth\nsc generate type user\nsc generate route user\n```\n\n## Aliases\n\n- `sc g`\n- `controller` -> `c`\n- `service` -> `s`\n- `module` -> `m` / `mo`\n- `middleware` -> `mw`\n- `type` -> `t`\n- `route` -> `r`\n\n## Path\n\n- append `in <path>` to write into a custom directory\n- default output for types is `src/app/types`\n";
