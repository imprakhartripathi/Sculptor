# @sculptor/template-registry

The SculptorTS template-registry package hosts scaffold and generator templates outside the CLI.

## What This Package Does

- Stores scaffold templates and generator templates
- Keeps template text out of CLI command code
- Exposes the generator helpers used by the CLI
- Gives future plugins a stable place to register templates

## Public API

The CLI consumes this package through the same generator helpers it used before:

- `scaffoldProject()`
- `generateResourceFiles()`
- `writeGeneratedFiles()`
- `syncTestHarness()`
- `controllerHelp`
- `generateHelp`

## Why It Exists

This keeps the CLI focused on command flow while the template package owns generator content.
