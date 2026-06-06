# @sculptor/di

The SculptorTS DI package provides explicit, decorator-driven dependency injection and package metadata.

## Release Line

- Current package version: `0.1.3`
- This package is part of the `v0.3.x` pre-release package-aware architecture line.

## What This Package Does

- Defines `@Service()`, `@Repository()`, `@Middleware()`, `@Package()`, and `@AutoInject()`
- Resolves singleton dependencies lazily
- Supports constructor and property injection
- Detects circular dependencies
- Exposes package metadata for package-aware runtime composition

## Explicit Injection Rule

Injection only happens where `@AutoInject()` is present.

There is no implicit autowiring.

## Public API

```ts
import {
  AutoInject,
  Container,
  Package,
  Repository,
  Service,
  Middleware,
  createContainer
} from "@sculptor/di";
```

## Package Metadata

`@Package({...})` marks a package index class as the package contract.

Metadata includes:

- `name`
- `path`
- `imports`
- `exports`
- `controllers`
- `services`
- `repositories`
- `middlewares`
- `routes`

## Container Behavior

- providers are singleton by default
- instances are created lazily on first resolve
- missing dependencies are detected during validation
- circular dependency chains are rejected

## License

MIT
