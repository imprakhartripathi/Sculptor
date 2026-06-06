# @sculptor/template-registry

The SculptorTS template-registry package hosts scaffold and generator templates outside the CLI.

## Version Notes

- Pre-release line: `v0.3.x`
- Current package version: `0.3.5`
- This pre-release line keeps the template registry focused on scaffold and generator content while the CLI owns orchestration, package registry updates, and `AGENTS.md` generation.
- Expect minor template adjustments and fixes until `v1.0.0`.

## What This Package Does

- Stores scaffold templates and generator templates
- Keeps template text out of CLI command code
- Exposes the generator helpers used by the CLI
- Gives future plugins a stable place to register templates
- Organizes templates under `src/registry/templates/` with a thin export-only `src/index.ts`
- Includes package scaffold templates for package-aware generation
- Supports marker-block based regeneration for package indexes and other generated files

## Public API

The CLI consumes this package through the same generator helpers it used before:

- `scaffoldProject()`
- `generateResourceFiles()`
- `writeGeneratedFiles()`
- `syncTestHarness()`
- `controllerHelp`
- `generateHelp`

When the CLI loads these helpers at runtime, it now does so lazily so global installs can recover if this package is missing.

Route generation now emits paired `*.route.ts` and `*.route.handler.ts` files by default.
Controller generation stays controller-first by default and can opt into paired functional files when requested.
Scaffolded apps now also receive a standard `.gitignore` with common Node and TypeScript ignores.

## Why It Exists

This keeps the CLI focused on command flow while the template package owns generator content.

## Template Layout

The registry is split into focused files:

- `src/registry/index.ts` for orchestration and exports
- `src/registry/templates/scaffold.ts` for app scaffolding templates
- `src/registry/templates/resources.ts` for generator resource templates
- `src/registry/templates/help.ts` for CLI help text
- `src/registry/utils.ts` for shared template helpers

This layout keeps template concerns explicit and makes future plugin-backed templates easier to add without changing the CLI surface.
