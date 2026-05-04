/**
 * Project-scoped registry for typed broker calls. Code that defines a
 * service's contract contributes to the registry via TypeScript
 * interface merging:
 *
 *     declare module 'typed-moleculer' {
 *       interface TypedActions {
 *         'users.getUser': { params: GetUserParams; returns: User };
 *         // Optional callableBy: only listed services can call.
 *         'users.adminTask': {
 *           params: AdminTaskParams;
 *           returns: void;
 *           callableBy: 'users' | 'admin';
 *         };
 *       }
 *       interface TypedEvents {
 *         'users.created': { payload: User; emittedBy: 'users' };
 *         // emittedBy optional: omit it for events anyone may emit.
 *         'metrics.tick': { payload: void };
 *       }
 *       interface TypedChannels {
 *         'orders.placed': { payload: Order; publishedBy: 'orders' };
 *       }
 *       // For names delivered as BOTH event and channel (durability-
 *       // fallback pattern: try publish, catch and emit):
 *       interface TypedDeliverables {
 *         'observe-router.message': {
 *           payload: CommonMessage;
 *           emittedBy: 'observe-router' | 'transformer';
 *           publishedBy: 'observe-router' | 'transformer';
 *         };
 *       }
 *     }
 *
 * TypeScript merges all `declare module 'typed-moleculer'` blocks
 * reachable from the current compilation unit's import graph. In a
 * monorepo, package dependencies become the natural compile-time scope:
 * a service that doesn't depend on the `users` package can't see
 * `users.*` actions at all.
 *
 * Each entry's shape (authorization fields are all OPTIONAL — omit to
 * mean "anyone in scope may call/emit/publish"):
 *   - Action      : `{ params: P; returns: R; callableBy?: S | ... }`
 *   - Event       : `{ payload: P; emittedBy?: S | ... }`
 *   - Channel     : `{ payload: P; publishedBy?: S | ... }`
 *   - Deliverable : `{ payload: P; emittedBy?: ...; publishedBy?: ... }`
 *
 * `callableBy` / `emittedBy` / `publishedBy` are string-literal unions
 * of authorized service names. When set, only the listed services may
 * call/emit/publish at compile time. When absent, the entry is
 * unrestricted (any importer with the entry in scope may use it).
 *
 * `TypedDeliverables` is sugar for declaring the same name in BOTH
 * `TypedEvents` (with `emittedBy`) AND `TypedChannels` (with
 * `publishedBy`) without textual duplication. `EventName`/`ChannelName`
 * traverse both `Typed{Events,Channels}` and `TypedDeliverables`, so
 * `broker.emit` and `broker.publish` see the deliverable name on their
 * respective method only — the per-method narrowing that catches
 * publish-without-channel bugs is preserved.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TypedActions {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TypedEvents {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TypedChannels {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TypedDeliverables {}

// --- registered names ---

export type ActionName = keyof TypedActions;
export type EventName = keyof TypedEvents | keyof TypedDeliverables;
export type ChannelName = keyof TypedChannels | keyof TypedDeliverables;

// --- entry resolution (private) ---

/**
 * Pick the entry shape for an event name, preferring an explicit
 * `TypedEvents` declaration over a `TypedDeliverables` one. Names
 * present in both are treated as TypedEvents (the deliverable's
 * channel side still applies via `_ChannelEntry`). In practice
 * consumers should pick one location per name; this short-circuit is
 * defensive, not a feature.
 */
type _EventEntry<T extends EventName> = T extends keyof TypedEvents
  ? TypedEvents[T]
  : T extends keyof TypedDeliverables
    ? TypedDeliverables[T]
    : never;

type _ChannelEntry<T extends ChannelName> = T extends keyof TypedChannels
  ? TypedChannels[T]
  : T extends keyof TypedDeliverables
    ? TypedDeliverables[T]
    : never;

// --- payload / params / returns extractors ---

export type ActionParams<T extends ActionName> = TypedActions[T] extends {
  params: infer P;
}
  ? P
  : never;

export type ActionReturns<T extends ActionName> = TypedActions[T] extends {
  returns: infer R;
}
  ? R
  : never;

export type EventPayload<T extends EventName> =
  _EventEntry<T> extends {
    payload: infer P;
  }
    ? P
    : never;

export type ChannelPayload<T extends ChannelName> =
  _ChannelEntry<T> extends {
    payload: infer P;
  }
    ? P
    : never;

// --- authorization narrowing ---

/**
 * Actions that service `S` is authorized to call.
 * - Entry has `callableBy` and `S` is in it → action is callable
 * - Entry has no `callableBy` → action is callable by any `S` (unrestricted)
 * - Entry has `callableBy` but `S` is NOT in it → action excluded from union
 *
 * The fall-through to `A` (rather than `never`) when `callableBy` is
 * absent is the "unrestricted by default" semantic.
 */
export type CallableBy<S extends string> = {
  [A in ActionName]: TypedActions[A] extends { callableBy: infer Cb }
    ? S extends Cb
      ? A
      : never
    : A;
}[ActionName];

/**
 * Events that service `S` is authorized to emit. Same fall-through
 * semantic as `CallableBy<S>`: entries without `emittedBy` are
 * unrestricted.
 */
export type EmittableBy<S extends string> = {
  [E in EventName]: _EventEntry<E> extends { emittedBy: infer Em }
    ? S extends Em
      ? E
      : never
    : E;
}[EventName];

/**
 * Channels that service `S` is authorized to publish to. Same
 * fall-through semantic as `CallableBy<S>` / `EmittableBy<S>`:
 * entries without `publishedBy` are unrestricted.
 */
export type PublishableBy<S extends string> = {
  [C in ChannelName]: _ChannelEntry<C> extends { publishedBy: infer Pb }
    ? S extends Pb
      ? C
      : never
    : C;
}[ChannelName];
