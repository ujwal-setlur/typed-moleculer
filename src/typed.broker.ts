/**
 * `TypedBroker` — `ServiceBroker` with `call`/`emit`/`broadcast`/
 * `broadcastLocal`/`publish` strictly typed against the registry.
 *
 * Non-scoped: any registered action callable, any registered event
 * emittable. For per-service emit-ownership enforcement (only emit events
 * authorized via `emittedBy`), use `ScopedBroker<S>` (./broker.ts).
 *
 * Why an `Omit` + intersection rather than module augmentation:
 * moleculer 0.15's `ServiceBroker` declares loose overloads
 * (`call<TReturn, TParams>(actionName: string, params: TParams, ...)`
 * etc.). TypeScript module augmentation can ADD overloads but cannot
 * REPLACE them — the loose overloads always match calls with any string
 * name and any payload, shadowing stricter augmentation overloads. To
 * enforce strict typing, we omit the loose methods and intersect with
 * registry-typed replacements.
 */

import type { CallingOptions, ServiceBroker } from 'moleculer';

import type {
  ActionName,
  ActionParams,
  ActionReturns,
  ChannelName,
  ChannelPayload,
  EventName,
  EventPayload
} from './registry';
import type { ChannelPublishOptions } from './types/channel.publish';

/** Options accepted by `emit` / `broadcast` / `broadcastLocal`. */
export interface EmitOptions {
  /** Restrict delivery to event handlers in these service groups. */
  groups?: string | string[];
  /** Per-call meta merged into ctx.meta. */
  meta?: Record<string, unknown>;
  /** Calling Context propagated through the event chain. */
  ctx?: unknown;
  /** Per-call headers (0.15+). */
  headers?: Record<string, unknown>;
}

/**
 * Conditional rest tuple: collapses to a no-arg signature when the
 * action's params / event's payload / channel's payload is `void` (the
 * moleculer 0.14 ergonomic of `broker.call(name)` / `broker.broadcast(name)`
 * for void actions/events) and to the `(payload, opts?)` signature
 * otherwise. Registry contributions that declare `params: undefined` /
 * `payload: undefined` also satisfy `extends void` (undefined is a
 * subtype of void), so both conventions work — but `void` is the
 * recommended spelling in registry declarations: it reads as "no
 * params/payload" rather than "the literal undefined value".
 */
type CallArgs<T extends ActionName> =
  ActionParams<T> extends void
    ? [params?: undefined, opts?: CallingOptions]
    : [params: ActionParams<T>, opts?: CallingOptions];

type EmitArgs<T extends EventName> =
  EventPayload<T> extends void
    ? [payload?: undefined, opts?: EmitOptions]
    : [payload: EventPayload<T>, opts?: EmitOptions];

type ChannelArgs<T extends ChannelName> =
  ChannelPayload<T> extends void
    ? [payload?: undefined, opts?: ChannelPublishOptions]
    : [payload: ChannelPayload<T>, opts?: ChannelPublishOptions];

/**
 * `ServiceBroker` with call/emit/broadcast/broadcastLocal/publish typed
 * strictly against the registry. No emit-ownership scoping — any
 * registered name accepted (subject to compilation-unit visibility).
 */
export type TypedBroker = Omit<
  ServiceBroker,
  'call' | 'emit' | 'broadcast' | 'broadcastLocal' | 'publish'
> & {
  call<T extends ActionName>(
    name: T,
    ...args: CallArgs<T>
  ): Promise<ActionReturns<T>>;

  emit<T extends EventName>(name: T, ...args: EmitArgs<T>): Promise<void>;

  broadcast<T extends EventName>(name: T, ...args: EmitArgs<T>): Promise<void>;

  broadcastLocal<T extends EventName>(
    name: T,
    ...args: EmitArgs<T>
  ): Promise<void>;

  publish<T extends ChannelName>(
    name: T,
    ...args: ChannelArgs<T>
  ): Promise<void>;
};

/**
 * Type-narrowing factory. Returns the same broker instance, just typed
 * as `TypedBroker`. Runtime is unchanged — moleculer 0.15's
 * `ServiceBroker` (with the channels middleware injecting `publish`).
 */
export function createTypedBroker(broker: ServiceBroker): TypedBroker {
  return broker as unknown as TypedBroker;
}
