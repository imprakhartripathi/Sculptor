![SculptorTS](https://raw.githubusercontent.com/imprakhartripathi/Sculptor/main/assets/sculptor-full-bg.png)

## Release Notes

### v1.2.0 (v1.2-26.09)

This release adds:

- explicit controller request parameter injection with centralized resolution
- runtime codecs, validators, optional parameters, and typed input errors
- route-parameter verification for keyed `@ReqParam()` declarations
- `@Request()` and `@Response()` decorators while preserving `Req` and `Res` type aliases
- parameter-local injection that preserves v1.1 positional arguments for undecorated parameters
- package-aware and non-package codec and validator generation
- preserved legacy controller invocation and existing core error compatibility

Current release line: `v1.2.0`

- `@sculptor/core` `1.2.0`
- `@sculptor/router` `1.2.0`
- `@sculptor/config` `1.2.0`
- `@sculptor/paws` `1.2.0`
- `@sculptor/template-registry` `1.2.0`
- `@sculptor/cli` `1.2.0`
- `@sculptor/di` `1.2.0`

This is the stable `v1.2.0` line. Future changes should stay additive and backwards-conscious.

### v1.1.4 (Historical)

The `v1.1.4` release added:

- native Express builder support with strongly typed `use()`, `set()`, `enable()`, `disable()`, and `locals()`
- automatic app root discovery through `findAppRoot()` and `resolveRootDir()`
- `startApp({ app })` support alongside the legacy `startApp({ rootDir })` path
- `sc update project` with per-package version checks and update prompts
- `sc report` for support links and issue reporting
- terminal-friendly `sc help` output with highlighted links
- zero-migration scaffolding for new `v1.1.x` apps
- cleaner generated `src/main.ts` scaffolds that use the native builder startup style
- preserved legacy startup templates for backwards compatibility
- exact package naming and file resolution for registry workflows
- calm diagnostics with `sc doctor`
- `sc agents` and `sc agents refresh` for `AGENTS.md`
- `req.ctx` as the default request context on Sculptor-bootstrapped apps

The `v1.1.x` releases are historical and superseded by `v1.2.0` for current development.

Versions before `v1.0.0` are no longer actively maintained and will not receive future updates.

Historical package ranges remain documented in [CHANGELOG.md](CHANGELOG.md).
