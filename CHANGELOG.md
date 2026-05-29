# Changelog

This changelog documents the current Sculptor release line and the historical ranges that remain relevant for compatibility and support conversations.

## v0.3.x Pre-Release

The `v0.3.x` pre-release line is the package-aware Sculptor architecture.

Highlights:

- package indexes are now first-class via `@Package({...})`
- `sculptor.packages.json` tracks package ownership and file tracking
- explicit DI is available through `@sculptor/di`
- `req.ctx` is available by default in Sculptor-bootstrapped apps
- `sc doctor` provides calm diagnostics and compatibility checks
- `sc agents` and `sc agents refresh` generate `AGENTS.md`
- package-aware generation keeps package contracts and registry metadata aligned
- `sc update` now updates only the globally installed `@sculptor/cli`
- generated package indexes use deterministic marker blocks instead of full-file rewrites
- the CLI supports package aliases such as `pkg` / `package`, `ls` / `list`, and `reg` / `register` / `r`
- hybrid apps continue to support decorator, functional, and mixed composition

This is still the pre-release phase, so changes may continue to land as the package contracts settle on the way to `v1.0.0`.

Current pre-release package family:

- `@sculptor/core`
- `@sculptor/router`
- `@sculptor/config`
- `@sculptor/paws`
- `@sculptor/cli`
- `@sculptor/template-registry`
- `@sculptor/di` begins at `0.1.1`

## Legacy Compatibility Notes

The following ranges are retained as historical compatibility references.

### `@sculptor/router`

- Deprecated: `0.2.0` through `0.2.4`
- Historical stable line: `0.2.5`

Reason:

- earlier router releases predate the final `@Patch()` support, functional router ergonomics, and bootstrap-time route collision detection
- those versions are more likely to surface duplicate route registrations, stale generated output, and weaker route diagnostics

### `@sculptor/core`

- Deprecated: `0.2.0` through `0.2.2`
- Historical stable line: `0.2.3`

Reason:

- earlier core releases predate the stabilized request context, non-listening bootstrap mode, and centralized framework error hook
- those versions are more likely to expose bootstrap/runtime inconsistencies in generated apps

### `@sculptor/cli`

- Deprecated: `0.2.0`
- Historical stable line: `0.2.4`

Reason:

- the older CLI release predates the current config command set and the updated route/handler generation contract
- it also assumes the older template layout, which can break installs and scaffold output in current workspaces
- the historical line introduced runtime recovery for missing template-registry installs and the initial `sc install deps`, `sc update`, and scaffolded `.gitignore` flows

### `@sculptor/template-registry`

- Deprecated: `0.1.0` through `0.1.5`
- Historical stable line: `0.1.6`

Reason:

- earlier template-registry releases predate the registry split, the current template file layout, and the standardized route/handler scaffolds
- those versions can produce stale generated files or miss the files the CLI expects to load

## Historical Feature Summary

The older stable line documented:

- route collision detection with source labels
- `@Patch()` support
- Sculptor-native functional router scopes
- `.env` loading and recursive config interpolation
- config redaction helpers
- `bootstrapApp({ listen: false })`
- framework error hooks with request context
- controller-first scaffolding with explicit functional opt-in
- paired `*.route.ts` and `*.route.handler.ts` generation
- registry-backed template organization
- runtime recovery for missing CLI template-registry dependencies
- `sc install deps` and `sc i deps` for app dependency recovery
- `sc update` for global package refreshes outside app roots
- scaffolded `.gitignore` generation
