# Contributing to SculptorTS

## Welcome

SculptorTS is a TypeScript-first, Express-based framework split across npm workspaces. The repo contains the runtime packages, the CLI, the template registry, and a sample app workspace under `app/`.

## Before You Start

- Read the root docs in `readme.md`.
- Read the package docs in `packages/*/README.md`.
- Install dependencies with `npm install`.
- Make sure you are working on the stable line described in `readme.md` and `CHANGELOG.md`.

## Development Setup

The repo uses npm workspaces:

- `app/` is the app workspace
- `packages/*` are published packages

Useful root commands:

```bash
npm install
npm run dev
npm run start
npm run build
npm run lint
npm test
```

Package-specific builds use workspaces directly:

```bash
npm run build --workspace @sculptor/config
npm run build --workspace @sculptor/router
npm -w app run build
```

To run the CLI from the repo:

```bash
npm run cli -- help
```

## Running the Project

From the repo root:

- `npm run dev` starts the example app from source through the workspace script
- `npm run start` starts the app in production-style mode
- `npm run build` builds the packages first, then builds `app/`

In a Sculptor app root:

```bash
sc dev
sc start
sc build
```

If you are working on the CLI itself, use the local entrypoint:

```bash
sc help
sc new demo-app
sc g c user
```

## Running Tests

Run the full test suite from the repo root:

```bash
npm test
```

`npm test` runs `pretest` first, so the workspace packages are built before Vitest executes.

For a focused run, call Vitest directly:

```bash
npx vitest run tests/cli.test.ts
```

## Linting

Use the root lint script:

```bash
npm run lint
```

Linting is configured for TypeScript files and ignores `dist/` and `node_modules/`.

## Repository Structure

- `app/` - sample app workspace used by the root scripts
- `packages/config/` - config loading, interpolation, and redaction
- `packages/core/` - runtime bootstrap and server startup
- `packages/router/` - decorators, functional routers, and route assembly
- `packages/paws/` - logger and dog mode output
- `packages/template-registry/` - scaffold and generator templates
- `packages/cli/` - CLI, scaffolding, config commands, and generators
- `tests/` - repository-level integration and regression tests

## Working With Packages

Each package has its own `package.json`, `tsconfig.json`, and `src/` tree.

- Keep package changes local to the owning package when possible.
- Use workspace builds when you only need to validate one package.
- Update dependent packages together when a public API changes.
- Keep package docs in sync with behavior changes.
- Publishable packages run `npm run prepack` before publish, which builds the package first.
- The repo does not document a broader release automation flow, so version bumps and release coordination should follow the stable lines tracked in `readme.md` and `CHANGELOG.md`.

The published packages currently depend on each other like this:

- `@sculptor/core` depends on `@sculptor/config`, `@sculptor/paws`, and `@sculptor/router`
- `@sculptor/cli` depends on `@sculptor/config`, `@sculptor/core`, and `@sculptor/template-registry`
- `@sculptor/paws` depends on `@sculptor/config`

## Coding Standards

- Use TypeScript strict mode and ES modules.
- Keep code direct and small where possible.
- Match the repository's existing terminology: `sculptor.json`, `props.json`, `sc`, `registry`, `functional router`, `dog mode`.
- Prefer explicit behavior over clever abstractions.
- Keep comments and log messages short and practical.
- If you intentionally ignore a variable or argument, prefix it with `_` to match the ESLint rules.

The codebase already uses experimental decorators and emitted decorator metadata, so changes in `@sculptor/router` and `@sculptor/core` should preserve that contract.

## Commit Guidelines

The repo does not document a formal conventional-commit rule. Match the existing style instead:

- keep subjects short
- use plain language
- describe one change per commit
- avoid bundling unrelated refactors

Examples from the repo history include `docs`, `bug fixes`, and other short lowercase summaries.

## Pull Request Process

- Summarize the change and the affected package(s).
- Link the related issue if there is one.
- Include tests that cover the behavior change.
- Update docs when commands, config, or public APIs change.
- Call out breaking changes clearly.
- Keep the diff focused on the requested work.

## Reporting Bugs

Use the bug report issue template and include:

- Sculptor version
- Node version
- affected package
- exact reproduction steps
- expected behavior
- actual behavior
- environment details

For CLI or scaffold bugs, include the exact `sc` command and the files that were generated or modified.

## Requesting Features

Use the feature request issue template and describe:

- the problem being solved
- the proposed solution
- alternatives you considered
- example usage when it helps

If the request affects CLI output, router behavior, config loading, or generated files, include a concrete before-and-after example.

## Documentation Contributions

Docs live in:

- `readme.md`
- `packages/*/README.md`
- `CHANGELOG.md`

When behavior changes, update the relevant package docs at the same time. Keep examples aligned with the current CLI commands and stable package versions.

## Questions and Discussions

Use GitHub Discussions if the repository has it enabled. For concrete bugs or missing behavior, open an issue instead. If a question is really about the docs, a documentation issue is usually the fastest path.
