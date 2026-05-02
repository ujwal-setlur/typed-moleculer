/**
 * Project-scoped registry for typed broker calls. Code that defines a
 * service's contract contributes to the registry via TypeScript
 * interface merging:
 *
 *     declare module 'typed-moleculer' {
 *       interface TypedActions {
 *         'users.getUser': { params: GetUserParams; returns: User };
 *       }
 *       interface TypedEvents {
 *         'users.created': { payload: User; emittedBy: 'users' };
 *       }
 *       interface TypedChannels {
 *         'orders.placed': { payload: Order; publishedBy: 'orders' };
 *       }
 *     }
 *
 * TypeScript merges all `declare module 'typed-moleculer'` blocks
 * reachable from the current compilation unit's import graph. In a
 * monorepo, package dependencies become the natural compile-time scope:
 * a service that doesn't depend on the `users` package can't call
 * `users.*` actions.
 *
 * Each entry's shape:
 *   - Action  : `{ params: P; returns: R }`
 *   - Event   : `{ payload: P; emittedBy: S | S2 | ... }`
 *   - Channel : `{ payload: P; publishedBy: S | S2 | ... }`
 *
 * `emittedBy` / `publishedBy` is a string-literal union of authorized
 * service names. A service can only emit/publish entries whose
 * authorization includes its own name.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TypedActions {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TypedEvents {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TypedChannels {}

// --- registered names ---

export type ActionName = keyof TypedActions;
export type EventName = keyof TypedEvents;
export type ChannelName = keyof TypedChannels;

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

export type EventPayload<T extends EventName> = TypedEvents[T] extends {
  payload: infer P;
}
  ? P
  : never;

export type ChannelPayload<T extends ChannelName> = TypedChannels[T] extends {
  payload: infer P;
}
  ? P
  : never;

// --- emit-ownership narrowing ---

/**
 * Events that service `S` is authorized to emit.
 * Maps each registered event to itself if `S` is in its `emittedBy` union,
 * else `never`. The `[EventName]` index access flattens to the union of
 * non-`never` values.
 */
export type EmittableBy<S extends string> = {
  [E in EventName]: TypedEvents[E] extends { emittedBy: infer Em }
    ? S extends Em
      ? E
      : never
    : never;
}[EventName];

/**
 * Channels that service `S` is authorized to publish to.
 */
export type PublishableBy<S extends string> = {
  [C in ChannelName]: TypedChannels[C] extends { publishedBy: infer Pb }
    ? S extends Pb
      ? C
      : never
    : never;
}[ChannelName];
