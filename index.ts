/**
 * typed-moleculer — compile-time typed broker + decorators for moleculer 0.15+.
 *
 * The registry pattern lets each API package declare its actions, events,
 * and channels via `declare module 'typed-moleculer'`. TypeScript merges
 * all contributions reachable from the consumer's import graph; the
 * resulting types feed `TypedBroker<S>`.
 *
 * One typed broker:
 *   - `TypedBroker<S>` — strict typing on call/emit/broadcast/publish,
 *     narrowed by service-identity `S` via the optional `callableBy` /
 *     `emittedBy` / `publishedBy` registry fields. Pass `<any>` to opt
 *     out of scoping deliberately (tests, throwaway code).
 *
 * IMPORTANT: typed-moleculer does NOT augment moleculer's `ServiceBroker`
 * directly. moleculer 0.15 ships loose overload signatures
 * (`call<TReturn, TParams>(actionName: string, params: TParams, ...)`)
 * that TypeScript module augmentation cannot REPLACE — only ADD to.
 * Loose overloads always match calls with any string + any params,
 * shadowing strict additions. To get strict typing, consumer code must
 * type its broker as `TypedBroker<S>`.
 *
 * Decorators (`@Service`, `@Action`, `@Event`, `@Channel`, `@Method`,
 * `@CronJob`) provide convenience class-based service authoring on top
 * of moleculer's plain `ServiceSchema` shape.
 */

// Registry interfaces (open for declaration merging) + helper types
export type {
  ActionName,
  ActionParams,
  ActionReturns,
  CallableBy,
  ChannelName,
  ChannelPayload,
  EmittableBy,
  EventName,
  EventPayload,
  PublishableBy,
  TypedActions,
  TypedChannels,
  TypedDeliverables,
  TypedEvents
} from './src/registry';

// Typed broker — strict typing via Omit + intersection
export { createTypedBroker } from './src/typed.broker';
export type { EmitOptions, TypedBroker } from './src/typed.broker';

// Typed Context — moleculer Context with broker re-typed strictly. Use
// in handler signatures to get strict typing on `ctx.broker.X(...)`.
export type { TypedContext } from './src/context';

// Channels publish options
export type { ChannelPublishOptions } from './src/types/channel.publish';

// Decorators (class-based service authoring)
export {
  Action,
  Channel,
  CronJob,
  Event,
  Method,
  Service
} from './src/decorators';
export type {
  ActionOptions,
  ChannelOptions,
  CronJobOptions,
  EventOptions,
  ServiceOptions
} from './src/decorators';
