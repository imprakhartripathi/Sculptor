![SculptorTS](https://raw.githubusercontent.com/imprakhartripathi/Sculptor/main/assets/sculptor-full-bg.png)

## Release Notes

Current release line: `v1.1.4`

- `@sculptor/core` `1.1.4`
- `@sculptor/router` `1.1.4`
- `@sculptor/config` `1.1.4`
- `@sculptor/paws` `1.1.4`
- `@sculptor/template-registry` `1.1.4`
- `@sculptor/cli` `1.1.4`
- `@sculptor/di` `1.1.4`

This line adds:

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

This is the stable `v1.1.4` line. Future changes should stay additive and backwards-conscious.

The `v1.1.0` through `v1.1.3` release line is deprecated in favor of `v1.1.4`. `v1.1.4` is the intended stable release line to use.

Versions before `v1.0.0` are no longer actively maintained and will not receive future updates.

Historical package ranges remain documented in [CHANGELOG.md](CHANGELOG.md).
