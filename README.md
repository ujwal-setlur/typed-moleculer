# typed-moleculer

> Compile-time typed broker + decorators for [Moleculer](https://moleculer.services) 0.15+.

`broker.call`, `broker.emit`, `broker.broadcast`, and `broker.publish`
in stock Moleculer are loosely typed (`string`, `any`). Wrong action
names, wrong payload shapes, and wrong return types all sail through
TypeScript and surface as runtime failures.

`typed-moleculer` provides:

- A **registry pattern** for declaring your actions, events, and
  channels via TypeScript interface merging — distributed across your
  codebase, scoped by your import graph.
- A **`TypedBroker`** view that strictly types `call` / `emit` /
  `broadcast` / `broadcastLocal` / `publish` against the registry.
- A **`ScopedBroker<S>`** view that adds **emit-ownership enforcement**:
  events and channels declare which services are authorized to
  emit/publish them, and the broker for service `S` only accepts those.
- **Class-based service decorators** (`@Service`, `@Action`, `@Event`,
  `@Channel`, `@Method`, `@CronJob`) that compile down to a clean
  Moleculer `ServiceSchema`.

```ts
import { createScopedBroker } from 'typed-moleculer';
import { ServiceBroker } from 'moleculer';

const broker = createScopedBroker<'orders'>(new ServiceBroker(opts));

await broker.call('users.getUser', { id: 'u1' });   // ✓ params + return typed
broker.emit('orders.placed', payload);              // ✓ authorized
broker.emit('users.created', payload);              // ✗ TS error: not authorized
broker.call('does.not.exist', {});                  // ✗ TS error: unknown action
```

---

## Requirements

- **Moleculer**: `^0.15.0` (peer dependency)
- **Node.js**: `>= 22.22.0`
- **ESM only.** typed-moleculer 5.0 is an ES module; CommonJS consumers
  are not supported.
- **TypeScript**: 5.x or 6.x with `experimentalDecorators: true` if you
  use the class decorators.

## Installation

```sh
npm install typed-moleculer
# or
pnpm add typed-moleculer
# or
yarn add typed-moleculer
```

Moleculer is a peer dep — install it separately:

```sh
npm install moleculer
```

---

## The registry pattern

The core of typed-moleculer is three open interfaces — `TypedActions`,
`TypedEvents`, `TypedChannels` — that you populate via TypeScript
[interface merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation).
Anywhere in your project (typically next to where you define the related
types), add a `declare module 'typed-moleculer'` block:

```ts
// src/api/users/registry.ts
import 'typed-moleculer';

export interface User {
  id: string;
  email: string;
  name: string;
}

declare module 'typed-moleculer' {
  interface TypedActions {
    'users.getUser': { params: { id: string }; returns: User };
    'users.create': { params: Omit<User, 'id'>; returns: User };
  }

  interface TypedEvents {
    'users.created': { payload: User; emittedBy: 'users' };
    'users.deleted': { payload: { id: string }; emittedBy: 'users' };
  }

  interface TypedChannels {
    'audit.event': {
      payload: { service: string; action: string; at: number };
      publishedBy: 'users' | 'orders' | 'inventory';
    };
  }
}
```

TypeScript merges every `declare module 'typed-moleculer'` block
reachable from the current compilation unit's import graph. In a
monorepo, package dependencies become natural compile-time scope: a
service that doesn't depend on the `users` package can't see (and so
can't call) `users.*` actions.

### Entry shapes

```ts
// Action — strict on params + returns
'users.getUser': { params: GetUserParams; returns: User };

// Action with no params
'users.ping': { params: undefined; returns: string };

// Event — strict on payload + authorized emitters
'users.created': { payload: User; emittedBy: 'users' };

// Multi-emitter event (union)
'inventory.adjusted': {
  payload: InventoryAdjusted;
  emittedBy: 'orders' | 'returns' | 'inventory';
};

// Channel — strict on payload + authorized publishers
'audit.event': {
  payload: AuditEvent;
  publishedBy: 'users' | 'orders';
};
```

`emittedBy` and `publishedBy` are string-literal unions of the service
names authorized to emit/publish. The owning module is the single source
of truth for both shape and authorization.

---

## The two broker views

typed-moleculer doesn't replace Moleculer's `ServiceBroker` — it
provides typed *views* of it. Two are exported:

### `TypedBroker`

Strict typing on `call`/`emit`/`broadcast`/`broadcastLocal`/`publish`,
no service-identity scoping. Any registered name accepted.

```ts
import { createTypedBroker, type TypedBroker } from 'typed-moleculer';
import { ServiceBroker } from 'moleculer';

const broker: TypedBroker = createTypedBroker(new ServiceBroker(opts));

const user = await broker.call('users.getUser', { id: 'u1' });
//    ^? User

broker.emit('users.created', userObj);    // ✓
broker.publish('audit.event', auditObj);  // ✓
broker.call('does.not.exist', {});        // ✗ TS error
broker.emit('users.created', { wrong });  // ✗ TS error: bad payload
```

### `ScopedBroker<S>`

Same strict typing as `TypedBroker`, *plus* emit-ownership: `emit` /
`broadcast` / `broadcastLocal` / `publish` are narrowed to entries whose
`emittedBy` / `publishedBy` includes the service identity `S`. `call`
remains unscoped (any service can call any action).

```ts
import { createScopedBroker, type ScopedBroker } from 'typed-moleculer';

const broker: ScopedBroker<'users'> = createScopedBroker<'users'>(new ServiceBroker(opts));

broker.emit('users.created', userObj);     // ✓ users authorized
broker.emit('orders.placed', orderObj);    // ✗ TS error: orders.placed emittedBy='orders'
broker.publish('audit.event', auditObj);   // ✓ users in publishedBy union
broker.publish('orders.outbound', x);      // ✗ TS error if orders.outbound publishedBy excludes users
```

### Which to use?

The two views differ only in whether **emit-ownership** is enforced.
Both produce identical strictness on action/event/channel names and
payload shapes; `ScopedBroker<S>` additionally narrows `emit` /
`broadcast` / `broadcastLocal` / `publish` to entries whose
`emittedBy` / `publishedBy` includes the service identity `S`. `call`
is not affected — both views allow calling any registered action.

**Rule of thumb**: if there's a single service identity associated with
the code path, use `ScopedBroker<S>`. Otherwise, use `TypedBroker`.

**`ScopedBroker<S>`** — service handler code (the common case):
- Per-service broker construction (`createScopedBroker<'users'>(...)`)
- Service handler functions where the service identity is fixed
- Anywhere you want compile errors for accidentally emitting another
  service's event, e.g.:
  ```ts
  // Inside the 'users' service:
  broker.emit('orders.placed', payload);  // ✗ TS error — 'users' isn't authorized
  ```

**`TypedBroker`** — code that legitimately doesn't have a service
identity:
- Tests / fixtures
- REPL or admin tools that act on behalf of multiple services
- Generic infrastructure helpers, e.g.:
  ```ts
  function broadcastSystemEvent(broker: TypedBroker, event: SystemEvent) {
    return broker.broadcast('system.event', event);
  }
  ```
- One-off scripts that need registry-typed access without claiming a
  specific identity

If you're unsure, default to `ScopedBroker<S>`. Picking a service
identity is almost always more correct than not — and if you need to
emit cross-service from inside a service, that's usually a signal of an
unintended coupling that the type checker is helpfully flagging.

### Typed `ctx.broker` via `TypedContext` / `ScopedContext<S>`

The same distinction as `TypedBroker` vs `ScopedBroker<S>` applies to
Context: the two views differ only in whether emit-ownership is
enforced on `ctx.broker.X(...)`. `TypedContext` types `ctx.broker` as
`TypedBroker`; `ScopedContext<S>` types it as `ScopedBroker<S>`.

**Rule of thumb**: pick the Context view that matches the broker view
you'd choose for that code path. If unsure, default to
`ScopedContext<S>` — picking a service identity is almost always more
correct than not.

**`ScopedContext<S, TParams, TMeta, TLocals, THeaders>`** — service
handler code:

```ts
import type { ScopedContext } from 'typed-moleculer';

function getUser(ctx: ScopedContext<'users', { id: string }>) {
  ctx.broker.emit('users.created', userObj);     // ✓ users authorized
  ctx.broker.emit('orders.placed', orderObj);    // ✗ TS error
}
```

**`TypedContext<TParams, TMeta, TLocals, THeaders>`** — handlers /
helpers that don't represent a single service identity:

```ts
import type { TypedContext } from 'typed-moleculer';

// Generic helper that runs in any service's context
function logCtxAndCall(ctx: TypedContext<{ id: string }>) {
  ctx.broker.call('users.getUser', { id: ctx.params.id });  // strict
}
```

Both forward Moleculer's full Context generics:
`<TParams, TMeta, TLocals, THeaders>`. If you previously rolled your
own typed Context via `Omit<Context, 'broker'> & { broker: ... }`, you
can drop that and use these directly.

Note: typed-moleculer doesn't apply these automatically. If your
handler signature uses `Context` from moleculer (rather than
`TypedContext` or `ScopedContext<S>` from typed-moleculer),
`ctx.broker.X(...)` falls back to Moleculer's loose overloads — see
[Why not module augmentation?](#why-not-module-augmentation) below.

---

## Why not module augmentation?

A natural design would be to augment Moleculer's `ServiceBroker`
directly via `declare module 'moleculer' { interface ServiceBroker { ... } }`
so that **every** broker — including `ctx.broker` typed as plain
`ServiceBroker` — gets strict typing automatically.

This **does not work** with Moleculer 0.15. The framework ships loose
overload signatures:

```ts
class ServiceBroker {
  call<TReturn>(actionName: string): Promise<TReturn>;
  call<TReturn, TParams>(
    actionName: string,
    params: TParams,
    opts?: CallingOptions
  ): Promise<TReturn>;
  emit<TData>(eventName: string, data?: TData, opts?: Record<string, any>): Promise<void>;
  // ...
}
```

TypeScript module augmentation can **add** overloads but not **replace**
existing ones. The loose overloads always match calls with any string
+ any params, so they shadow stricter additions and the augmentation
becomes a no-op.

`TypedBroker` and `ScopedBroker<S>` work around this with `Omit` +
intersection: they remove the loose methods and intersect with strictly
typed replacements. The same applies to `TypedContext` and
`ScopedContext<S>` for `ctx.broker.X(...)` strictness in handlers. The
cost is that you must explicitly type your broker variable or your
Context — there's no implicit upgrade for code that uses
`ctx.broker: ServiceBroker` directly.

---

## Class-based service authoring

The decorators compile to a Moleculer `ServiceSchema` and wrap the
class constructor so `broker.createService(MyClass)` works directly.

```ts
import moleculer from 'moleculer';
import { Action, Channel, CronJob, Event, Method, Service } from 'typed-moleculer';

@Service({
  name: 'users',
  mixins: [...],
  settings: { /* ... */ }
})
export class UsersService extends moleculer.Service {
  @Action({ params: { id: 'string' } })
  async getUser(ctx: moleculer.Context<{ id: string }>) {
    return await this.fetchUser(ctx.params.id);
  }

  @Event()
  'orders.placed'(ctx: moleculer.Context<Order>) {
    this.logger.info(`order placed for ${ctx.params.userId}`);
  }

  @Channel({ group: 'users-audit', maxRetries: 3 })
  'audit.event'(ctx: moleculer.Context<AuditEvent>) {
    return this.appendToAuditLog(ctx.params);
  }

  @Method
  fetchUser(id: string) {
    /* helper, accessible as `this.fetchUser` from handlers */
  }

  @CronJob({ cronTime: '0 * * * *', timeZone: 'UTC' })
  async hourlySweep() {
    /* runs every hour */
  }

  // moleculer lifecycle hooks — declare as plain class methods
  async started() { /* ... */ }
  async stopped() { /* ... */ }
}

// Use:
broker.createService(UsersService);
```

User-supplied option fields not in Moleculer's strict 0.15 schema (e.g.
custom flags read by your own middlewares) pass through unchanged —
the decorator option types include an open `[key: string]: unknown`
index signature.

---

## API

### Registry interfaces (open for declaration merging)

| Interface | Purpose |
|---|---|
| `TypedActions` | Map of `<actionName>` → `{ params; returns }` |
| `TypedEvents` | Map of `<eventName>` → `{ payload; emittedBy }` |
| `TypedChannels` | Map of `<channelName>` → `{ payload; publishedBy }` |

### Helper types

| Type | Description |
|---|---|
| `ActionName` | Union of registered action names |
| `EventName` | Union of registered event names |
| `ChannelName` | Union of registered channel names |
| `ActionParams<T>` | Params type for action `T` |
| `ActionReturns<T>` | Return type for action `T` |
| `EventPayload<T>` | Payload type for event `T` |
| `ChannelPayload<T>` | Payload type for channel `T` |
| `EmittableBy<S>` | Union of events service `S` is authorized to emit |
| `PublishableBy<S>` | Union of channels service `S` is authorized to publish to |

### Brokers

| Symbol | Description |
|---|---|
| `TypedBroker` | Type — strict typing on call/emit/broadcast/publish |
| `ScopedBroker<S>` | Type — `TypedBroker` + emit-ownership for service `S` |
| `createTypedBroker(broker)` | Cast a `ServiceBroker` to `TypedBroker` |
| `createScopedBroker<S>(broker)` | Cast a `ServiceBroker` to `ScopedBroker<S>` |
| `EmitOptions` | Options for `emit` / `broadcast` / `broadcastLocal` |
| `ChannelPublishOptions` | Options for `publish` (channels middleware) |
| `TypedContext<P,M,L,H>` | Type — `Context` with `broker: TypedBroker` |
| `ScopedContext<S,P,M,L,H>` | Type — `Context` with `broker: ScopedBroker<S>` |

### Decorators

| Symbol | Description |
|---|---|
| `@Service(opts?)` | Class decorator — assembles a `ServiceSchema` from class members |
| `@Action(opts?)` | Method decorator — registers a Moleculer action |
| `@Event(opts?)` | Method decorator — registers an event handler |
| `@Channel(opts?)` | Method decorator — registers a channels-middleware handler |
| `@Method` | Method decorator — places a method on `service.methods` |
| `@CronJob(opts)` | Method decorator — registers a cron tick (requires a cron mixin) |

Option types:

| Type | Used by |
|---|---|
| `ServiceOptions` | `@Service` |
| `ActionOptions` | `@Action` |
| `EventOptions` | `@Event` |
| `ChannelOptions` | `@Channel` |
| `CronJobOptions` | `@CronJob` |

All option types except `CronJobOptions` include an open
`[key: string]: unknown` index signature so user-supplied custom fields
(read by your own middlewares) pass through.

---

## Compatibility notes

### Channels middleware

`broker.publish` is provided at runtime by a channels middleware
(typically [`@moleculer/channels`](https://github.com/moleculerjs/channels)
or a fork). typed-moleculer types the call signature against
`TypedChannels` but does not provide the runtime implementation —
install and configure the channels middleware separately.

By convention `@moleculer/channels` exposes its method as
`broker.sendToChannel`. To match typed-moleculer's `broker.publish`
typing, configure the middleware with `sendMethodName: 'publish'`:

```ts
import ChannelsMiddleware from '@moleculer/channels';

const broker = new ServiceBroker({
  middlewares: [
    ChannelsMiddleware({
      adapter: 'AMQP',
      sendMethodName: 'publish'
    })
  ]
});
```

### TypeScript decorators

The class decorators use the *legacy* TypeScript decorator semantics
(`experimentalDecorators: true`), not the [stage-3](https://github.com/tc39/proposal-decorators)
proposal. Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

The runtime needs decorator metadata for parameter type reflection
(used by Moleculer's params validation when `@Action({ params: ... })`
is set). With SWC, enable both `legacyDecorator: true` and
`decoratorMetadata: true`:

```json
// .swcrc
{
  "jsc": {
    "transform": {
      "legacyDecorator": true,
      "decoratorMetadata": true
    }
  }
}
```

---

## Migrating from typed-moleculer 4.x

5.0 is a ground-up rewrite. Notable differences from 4.x:

- **Moleculer 0.15+ only.** No 0.14 support.
- **ESM only.** No CommonJS.
- **No `TypedServiceBroker<A, E, S, M>` class.** Replaced by
  `TypedBroker` + `ScopedBroker<S>` types (single string generic for
  service identity instead of four).
- **Per-service action/event union types are no longer needed.**
  Move them into the registry via `declare module 'typed-moleculer'`.
  Action/event/channel ownership lives at the package that defines the
  type, not at each consuming service.
- **`emittedBy` / `publishedBy` replace per-service `ServiceEvents`
  unions.** Authorization moves from the calling site to the entry
  declaration.
- **Decorator option types are more permissive.** Custom middleware
  fields (e.g. `restricted`, `stateChange`) pass through via an open
  `[key: string]: unknown` index signature.
- **Runtime decorator implementation is simpler.** No more mock-broker
  prototype walking; `@Service` reads metadata stashed by the method
  decorators directly off the class prototype.

There is no codemod. The migration is mechanical: convert per-service
union types into registry contributions, replace `TypedServiceBroker`
construction with `createScopedBroker<S>`, and audit `emittedBy` /
`publishedBy` for each event/channel.

---

## License

MIT — see [LICENSE](./LICENSE).
