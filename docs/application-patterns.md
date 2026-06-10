# Application Patterns

SculptorTS supports class-based, functional, and hybrid applications.

## Small Functional API

Best when:

- the app is small
- you want minimal ceremony
- your team prefers explicit functions over classes

Typical structure:

```ts
const users = FunctionalRouter("/users");
users.get((req, res) => res.json({ ok: true }));
```

Tradeoffs:

- lighter and faster to read
- fewer abstractions
- best for small feature slices and APIs

## Standard Class API

Best when:

- you want controller/service/repository separation
- your team likes decorator-based organization
- the app is growing and you want a structured slice model

Typical structure:

```ts
@Controller("/users")
export class UsersController {
  @Get("/")
  findAll() {
    return [];
  }
}
```

Tradeoffs:

- more structure
- better for teams that prefer class-based composition
- requires explicit DI and decorator usage

## Hybrid Application

Best when:

- you are migrating incrementally
- different feature areas prefer different styles
- you want package-aware composition without forcing one style everywhere

Typical structure:

- class-based package for core feature slices
- functional routers for lightweight routes
- unpackaged files for quick utilities or small endpoints

Tradeoffs:

- maximum flexibility
- slightly more convention to learn
- route collision awareness becomes important, which is why generated hybrid packages keep their functional route under `"/route"`

## Choosing a Style

Use functional when you want compact APIs.

Use class-based when you want framework organization with decorators and DI.

Use hybrid when you need both in the same app.

## Team Guidance

- small teams often move faster with functional slices
- larger teams often prefer class-based package ownership
- mixed teams usually benefit from hybrid mode with strong package boundaries

## Related Docs

- [Framework Lifecycle](framework-lifecycle.md)
- [Architecture](architecture.md)
- [Error Handling](error-handling.md)
