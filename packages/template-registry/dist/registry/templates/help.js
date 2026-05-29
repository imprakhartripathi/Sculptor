export const controllerHelp = `# Controller Generator

## Usage

\`\`\`bash
sc generate controller user
sc g c user
sc generate controller user in src/app/controllers
sc g c user --functional
\`\`\`

## Output

- \`controllers/*.controller.ts\`
- controller-first by default
- pass \`--functional\` to opt into paired functional route and handler files
`;
export const moduleHelp = `# Module Generator

## Usage

\`\`\`bash
sc generate module user
sc g mo user
\`\`\`
`;
export const middlewareHelp = `# Middleware Generator

## Usage

\`\`\`bash
sc generate middleware auth
sc g mw auth
\`\`\`
`;
export const repositoryHelp = `# Repository Generator

## Usage

\`\`\`bash
sc generate repository user
sc g repo user
\`\`\`

## Output

- \`*.repository.ts\`
- generates a \`@Repository()\` class
`;
export const dtoHelp = `# DTO Generator

## Usage

\`\`\`bash
sc generate dto user
sc g dto user
\`\`\`

## Output

- \`*.dto.ts\`
- generates an explicit DTO class
`;
export const typeHelp = `# Type Generator

## Usage

\`\`\`bash
sc generate type user
sc g t user
sc g t user -i
sc g t user -c
sc g t user -e
\`\`\`

## Flags

- \`-i\`, \`-interface\` => \`*.interface.ts\`
- \`-c\`, \`-class\` => \`*.class.ts\`
- \`-e\`, \`-enum\` => \`*.enum.ts\`
- default => \`*.type.ts\`
`;
export const routeHelp = `# Route Generator

## Usage

\`\`\`bash
sc generate route user
sc g r user
\`\`\`

## Output

- \`*.route.ts\`
- \`*.route.handler.ts\`
- uses \`FunctionalRouter(prefix)\`
- generates a paired handler with try/catch and error middleware boilerplate
`;
export const generateHelp = `# Generate

## Usage

\`\`\`bash
sc generate controller user
sc generate service user
sc generate module user
sc generate middleware auth
sc generate repository user
sc generate dto user
sc generate type user
sc generate route user
sc generate pkg user
sc generate package user
\`\`\`

## Aliases

- \`sc g\`
- \`controller\` -> \`c\`
- \`service\` -> \`s\`
- \`module\` -> \`m\` / \`mo\`
- \`middleware\` -> \`mw\`
- \`repository\` -> \`repo\`
- \`dto\` -> \`dto\`
- \`type\` -> \`t\`
- \`route\` -> \`r\`
- \`pkg\` -> \`pkg\`
- \`package\` -> \`package\`

## Path

- append \`in <path>\` to write into a custom directory
- default output for types is \`src/app/types\`
- default output for repositories is \`src/app/repositories\`
- default output for DTOs is \`src/app/dtos\`
- package generation uses the configured \`project.srcRoot\` unless \`in\` is provided
- package names are exact and are not singularized or pluralized automatically
- controller generators are controller-first by default; pass \`--functional\` only when you want the paired functional route files
- route generators always emit the paired functional route and handler files
`;
//# sourceMappingURL=help.js.map