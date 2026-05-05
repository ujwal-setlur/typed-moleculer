# typed-moleculer

> Compile-time typed broker + decorators for [Moleculer](https://moleculer.services) 0.15+.

`broker.call`, `broker.emit`, `broker.broadcast`, and `broker.publish`
in stock Moleculer are loosely typed (`string`, `any`). Wrong action
names, wrong payload shapes, wrong return types — all sail through
TypeScript and surface as runtime failures.

`typed-moleculer` provides:

- A **registry pattern** for declaring your actions, events, and
  channels via TypeScript interface merging — distributed across your
  codebase, scoped by your import graph.
- A **`TypedBroker<S>`** view with strict typing on `call` / `emit` /
  `broadcast` / `broadcastLocal` / `publish` against the registry,
  narrowed by service-identity authorization (`callableBy` /
  `emittableBy` / `publishableBy`).
- **`TypedDeliverables`** — sugar for entries delivered as both event
  AND channel (for the durability-fallback pattern: try `publish`,
  catch and `emit`).
- **Class-based service decorators** (`@Service`, `@Action`, `@Event`,
  `@Channel`, `@Method`, `@CronJob`) that compile down to a clean
  Moleculer `ServiceSchema`.

```ts
import { createTypedBroker } from 'typed-moleculer';
import { ServiceBroker } from 'moleculer';

const broker = createTypedBroker<'orders'>(new ServiceBroker(opts));

await broker.call('users.getUser', { id: 'u1' });   // ✓ params + return typed
broker.emit('orders.placed', payload);              // ✓ orders authorized to emit
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

The core of typed-moleculer is four open interfaces — `TypedActions`,
`TypedEvents`, `TypedChannels`, `TypedDeliverables` — that you populate
via TypeScript [interface merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation).
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
    // Optional callableBy: only listed services may call this action.
    'users.adminTask': {
      params: { taskId: string };
      returns: void;
      callableBy: 'users' | 'admin';
    };
  }

  interface TypedEvents {
    'users.created': { payload: User; emittableBy: 'users' };
    'users.deleted': { payload: { id: string }; emittableBy: 'users' };
    // No emittableBy — anyone may emit.
    'metrics.tick': { payload: void };
  }

  interface TypedChannels {
    'audit.event': {
      payload: { service: string; action: string; at: number };
      publishableBy: 'users' | 'orders' | 'inventory';
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

All authorization fields are **optional** — omit them to mean "anyone
in scope may use this entry."

```ts
// Action — strict on params + returns
'users.getUser': { params: GetUserParams; returns: User };

// Action with no params (use `void`, not `undefined`)
'users.ping': { params: void; returns: string };

// Action restricted to specific callers
'users.adminTask': {
  params: AdminTaskParams;
  returns: void;
  callableBy: 'users' | 'admin';
};

// Event — strict on payload + authorized emitters
'users.created': { payload: User; emittableBy: 'users' };

// Multi-emitter event
'inventory.adjusted': {
  payload: InventoryAdjusted;
  emittableBy: 'orders' | 'returns' | 'inventory';
};

// Event without emittableBy — unrestricted
'metrics.tick': { payload: void };

// Channel — strict on payload + authorized publishers
'audit.event': {
  payload: AuditEvent;
  publishableBy: 'users' | 'orders';
};

// Channel without publishableBy — unrestricted
'metrics.report': { payload: { metric: string; value: number } };
```

`callableBy` / `emittableBy` / `publishableBy` are string-literal unions of
the service names authorized to call/emit/publish. The owning module
is the single source of truth for both shape and authorization.

### `TypedDeliverables` — entries delivered as both event AND channel

A common pattern with channel-based messaging is the **durability
fallback**: a sender tries `broker.publish` first; on AMQP failure,
falls back to `broker.emit`. The receiver listens on both `@Channel`
and `@Event` for the same name.

Without a separate registry, you'd declare the entry twice — once in
`TypedEvents` (with `emittableBy`) and once in `TypedChannels` (with
`publishableBy`). `TypedDeliverables` lets you write it once:

```ts
declare module 'typed-moleculer' {
  interface TypedDeliverables {
    'orders.placed': {
      payload: Order;
      emittableBy: 'orders' | 'returns';
      publishableBy: 'orders' | 'returns';
    };
  }
}
```

`EventName` / `ChannelName` traverse both `Typed{Events,Channels}` and
`TypedDeliverables`, so the deliverable name shows up on `broker.emit`
*and* on `broker.publish` — preserving per-method narrowing (e.g. a
publish-only entry declared in `TypedChannels` is still rejected on
`emit`).

The `emittableBy` / `publishableBy` lists can differ if the asymmetry is
real; in typical durability-fallback usage they're the same.

---

## `TypedBroker<S>`

typed-moleculer doesn't replace Moleculer's `ServiceBroker` — it
provides a typed *view* of it. One type, parameterized by service
identity:

```ts
import { createTypedBroker, type TypedBroker } from 'typed-moleculer';
import { ServiceBroker } from 'moleculer';

const broker: TypedBroker<'users'> = createTypedBroker<'users'>(
  new ServiceBroker(opts)
);

const user = await broker.call('users.getUser', { id: 'u1' });
//    ^? User

broker.emit('users.created', userObj);    // ✓ users authorized
broker.emit('orders.placed', orderObj);   // ✗ TS error: emittableBy='orders' excludes 'users'
broker.publish('audit.event', auditObj);  // ✓ users in publishableBy
broker.call('users.adminTask', task);     // ✓ users in callableBy
broker.call('does.not.exist', {});        // ✗ TS error: unknown action
```

The `S extends string` generic is the broker's identity badge.
Authorization on each method is checked via the corresponding registry
helper:

| Method | Constraint |
|---|---|
| `broker.call(name, ...)` | `name extends CallableBy<S>` |
| `broker.emit(name, ...)` | `name extends EmittableBy<S>` |
| `broker.broadcast(name, ...)` / `broadcastLocal(name, ...)` | same as emit |
| `broker.publish(name, ...)` | `name extends PublishableBy<S>` |

Entries with their authorization field absent are unrestricted — any
`S` may use them. So scoping kicks in only where the registry
contributor has expressed a restriction.

### Opting out of scoping (`<any>`)

There's no default for `S` — consumers must pass an explicit identity.
Tests and unscoped tooling can pass `<any>` deliberately to opt out:

```ts
const broker = createTypedBroker<any>(new ServiceBroker(opts));
// ↑ unscoped: every authorization check passes
```

`any extends X` is truthy in conditional types, so `CallableBy<any>` =
all action names, `EmittableBy<any>` = all event names, etc. The result
is full registry visibility without any narrowing — equivalent to the
old "TypedBroker" view in 4.x.

The choice is greppable: `TypedBroker<any>` stands out in code review
as a deliberate "I'm not scoping this" assertion. Forgetting the
generic is a typecheck error rather than silent unscoped fallthrough.

### Typed `ctx.broker` via `TypedContext<S, ...>`

`ctx.broker.X(...)` inside handler code is typed only if `ctx` is typed
as `TypedContext<S, ...>` (rather than Moleculer's plain `Context`).
The `S` parameter narrows the broker the same way `TypedBroker<S>`
does:

```ts
import type { TypedContext } from 'typed-moleculer';

function getUser(ctx: TypedContext<'users', { id: string }>) {
  ctx.broker.emit('users.created', userObj);  // ✓ users authorized
  ctx.broker.emit('orders.placed', orderObj); // ✗ TS error
}
```

`TypedContext<any, ...>` is the unscoped form for handlers that
legitimately don't have a fixed identity (generic helpers, infra code).

`TypedContext<S, TParams, TMeta, TLocals, THeaders>` forwards
Moleculer's full Context generics. If you previously rolled your own
typed Context via `Omit<Context, 'broker'> & { broker: ... }`, you can
drop that and use `TypedContext<S, ...>` directly.

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

`TypedBroker<S>` works around this with `Omit` + intersection: it
removes the loose methods and intersects with strictly typed
replacements. The same applies to `TypedContext<S, ...>` for
`ctx.broker.X(...)` strictness in handlers. The cost is that you must
explicitly type your broker variable or your Context — there's no
implicit upgrade for code that uses `ctx.broker: ServiceBroker`
directly.

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
| `TypedActions` | Map of `<actionName>` → `{ params; returns; callableBy? }` |
| `TypedEvents` | Map of `<eventName>` → `{ payload; emittableBy? }` |
| `TypedChannels` | Map of `<channelName>` → `{ payload; publishableBy? }` |
| `TypedDeliverables` | Entries delivered as BOTH event and channel: `{ payload; emittableBy?; publishableBy? }` |

### Helper types

| Type | Description |
|---|---|
| `ActionName` | Union of registered action names |
| `EventName` | Union of registered event + deliverable names |
| `ChannelName` | Union of registered channel + deliverable names |
| `ActionParams<T>` | Params type for action `T` |
| `ActionReturns<T>` | Return type for action `T` |
| `EventPayload<T>` | Payload type for event `T` |
| `ChannelPayload<T>` | Payload type for channel `T` |
| `CallableBy<S>` | Union of actions service `S` is authorized to call |
| `EmittableBy<S>` | Union of events service `S` is authorized to emit |
| `PublishableBy<S>` | Union of channels service `S` is authorized to publish to |

### Broker

| Symbol | Description |
|---|---|
| `TypedBroker<S>` | Type — strict typing on call/emit/broadcast/publish, narrowed by service identity `S` |
| `createTypedBroker<S>(broker)` | Cast a `ServiceBroker` to `TypedBroker<S>` |
| `TypedContext<S, P, M, L, H>` | Type — `Context` with `broker: TypedBroker<S>` |
| `EmitOptions` | Options for `emit` / `broadcast` / `broadcastLocal` |
| `ChannelPublishOptions` | Options for `publish` (channels middleware) |

Pass `<any>` to opt out of scoping (full registry visibility) — useful
for tests, REPL/admin tools, and generic infrastructure helpers.

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
`TypedChannels` + `TypedDeliverables` but does not provide the runtime
implementation — install and configure the channels middleware
separately.

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

### Void params and payloads

For actions/events/channels with no params/payload, prefer `void` over
`undefined`:

```ts
'users.ping':       { params: void; returns: string };
'metrics.tick':     { payload: void };
'system.heartbeat': { payload: void; publishableBy: 'users' };
```

`broker.call('users.ping')` and `broker.broadcast('metrics.tick')` then
compile without a dummy positional `undefined` argument. Both `void`
and `undefined` satisfy the underlying `extends void` check (undefined
is a subtype of void), so existing registries declared with
`undefined` keep working — but `void` reads more accurately as "no
params/payload" rather than "the literal undefined value."

---

## Migrating from typed-moleculer 4.x

5.0 is a ground-up rewrite. Notable differences from 4.x:

- **Moleculer 0.15+ only.** No 0.14 support.
- **ESM only.** No CommonJS.
- **No `TypedServiceBroker<A, E, S, M>` class.** Replaced by
  `TypedBroker<S>` (single string generic for service identity instead
  of four). `createTypedBroker<S>(broker)` is the factory.
- **Per-service action/event union types are no longer needed.**
  Move them into the registry via `declare module 'typed-moleculer'`.
  Action/event/channel ownership lives at the package that defines the
  type, not at each consuming service.
- **Authorization fields (`callableBy` / `emittableBy` / `publishableBy`)
  are optional and live on the entry, not at the calling site.** Omit
  to mean "anyone in scope may use this entry"; specify to restrict.
- **`TypedDeliverables`** lets you declare entries that are both event
  and channel without textual duplication.
- **Decorator option types are more permissive.** Custom middleware
  fields (e.g. `restricted`, `stateChange`) pass through via an open
  `[key: string]: unknown` index signature.
- **Runtime decorator implementation is simpler.** No more mock-broker
  prototype walking; `@Service` reads metadata stashed by the method
  decorators directly off the class prototype.

There is no codemod. The migration is mechanical: convert per-service
union types into registry contributions, replace `TypedServiceBroker`
construction with `createTypedBroker<S>`, and audit
`callableBy` / `emittableBy` / `publishableBy` for each action /
event / channel.

---

## License

MIT — see [LICENSE](./LICENSE).
