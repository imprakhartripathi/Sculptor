# Contributing to SculptorTS

## Welcome

SculptorTS is a TypeScript-first, Express-based framework split across npm workspaces. The repo contains the runtime packages, the CLI, the template registry, the DI package, and the documentation set that describes the `v0.3.x` pre-release package-aware architecture.

## Before You Start

- Read the root docs in `readme.md`.
- Read the package docs in `packages/*/README.md`.
- Read the wiki pages in `wiki/` if you are touching user-facing behavior.
- Install dependencies with `npm install`.
- Make sure you are working on the current `v0.3.x` pre-release line documented in `readme.md` and `CHANGELOG.md`.

## Development Setup

The repo uses npm workspaces:

- `packages/*` are published packages
- `test-smoke/` may be used for local end-to-end validation in a gitignored smoke app

Useful root commands:

```bash
npm install
npm run build
npm test
```

Package-specific builds use workspaces directly:

```bash
npm run build --workspace @sculptor/config
npm run build --workspace @sculptor/router
npm run build --workspace @sculptor/cli
```

To run the CLI from the repo:

```bash
npm run cli -- help
```

## Running the Project

From the repo root:

- `npm run build` builds the workspace packages first
- `npm test` runs the repository-level test suite
- use a gitignored smoke app under `test-smoke/` if you want to validate the CLI end-to-end without touching git-tracked files

In a Sculptor app root:

```bash
sc dev
sc start
sc build
sc sync
sc doctor
```

If you are working on the CLI itself, use the local entrypoint:

```bash
sc help
sc new demo-app
sc g c user
sc g pkg user
sc agents
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

- `packages/config/` - config loading, interpolation, and redaction
- `packages/core/` - runtime bootstrap, request context, and server startup
- `packages/di/` - explicit DI, package metadata, and package composition
- `packages/router/` - decorators, functional routers, and route assembly
- `packages/paws/` - logger and dog mode output
- `packages/template-registry/` - scaffold and generator templates
- `packages/cli/` - CLI, scaffolding, config commands, diagnostics, and generators
- `test-smoke/` - optional gitignored smoke apps for local validation
- `tests/` - repository-level integration and regression tests

## Working With Packages

Each package has its own `package.json`, `tsconfig.json`, and `src/` tree.

- Keep package changes local to the owning package when possible.
- Use workspace builds when you only need to validate one package.
- Update dependent packages together when a public API changes.
- Keep package docs in sync with behavior changes.
- Package indexes are the runtime contract in the `v0.3.x` pre-release line, so changes to package composition should preserve generated marker blocks and `@Package(...)` metadata.
- Publishable packages run `npm run prepack` before publish, which builds the package first.

The published packages currently depend on each other like this:

- `@sculptor/core` depends on `@sculptor/config`, `@sculptor/paws`, `@sculptor/router`, and `@sculptor/di`
- `@sculptor/cli` depends on `@sculptor/config`, `@sculptor/core`, and `@sculptor/template-registry`
- `@sculptor/paws` depends on `@sculptor/config`

## Coding Standards

- Use TypeScript strict mode and ES modules.
- Keep code direct and small where possible.
- Match the repository's existing terminology: `sculptor.json`, `props.json`, `sc`, `registry`, `package index`, `functional router`, `dog mode`, and `AGENTS.md`.
- Prefer explicit behavior over clever abstractions.
- Keep comments and log messages short and practical.
- If you intentionally ignore a variable or argument, prefix it with `_` to match the ESLint rules.
- In NodeNext packages, keep runtime-facing imports in `.js` form even when authoring `.ts` source.

The codebase already uses experimental decorators and emitted decorator metadata, so changes in `@sculptor/router`, `@sculptor/core`, and `@sculptor/di` should preserve that contract.

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

For CLI, registry, or scaffold bugs, include the exact `sc` command and the files that were generated or modified.

## Requesting Features

Use the feature request issue template and describe:

- the problem being solved
- the proposed solution
- alternatives you considered
- example usage when it helps

If the request affects CLI output, router behavior, config loading, package indexes, or generated files, include a concrete before-and-after example.

## Documentation Contributions

Docs live in:

- `readme.md`
- `packages/*/README.md`
- `CHANGELOG.md`
- `wiki/`

When behavior changes, update the relevant package docs at the same time. Keep examples aligned with the current CLI commands and release line.

## Questions and Discussions

Use GitHub Discussions if the repository has it enabled. For concrete bugs or missing behavior, open an issue instead. If a question is really about the docs, a documentation issue is usually the fastest path.
