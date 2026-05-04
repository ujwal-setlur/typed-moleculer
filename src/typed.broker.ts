/**
 * `TypedBroker<S>` — `ServiceBroker` with `call`/`emit`/`broadcast`/
 * `broadcastLocal`/`publish` strictly typed against the registry AND
 * narrowed by service-identity authorization.
 *
 * The single generic `S extends string` is the broker's identity badge
 * — the service whose perspective the broker takes. Authorization on
 * each method is checked via the corresponding registry helper:
 *
 *   - `broker.call(name)`     → `name extends CallableBy<S>`
 *   - `broker.emit(name)`     → `name extends EmittableBy<S>`
 *   - `broker.broadcast(name)`/`broadcastLocal(name)` → same as emit
 *   - `broker.publish(name)`  → `name extends PublishableBy<S>`
 *
 * Entries with their authorization field absent (e.g., no `emittedBy`
 * declared on an event) are unrestricted — any `S` may use them. So
 * scoping kicks in only where the registry contributor has expressed
 * a restriction.
 *
 * No default for `S` — consumers must pass an explicit identity. Tests
 * and unscoped tooling can pass `<any>` deliberately to opt out, which
 * makes the choice greppable.
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
  CallableBy,
  ChannelName,
  ChannelPayload,
  EmittableBy,
  EventName,
  EventPayload,
  PublishableBy
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
 * strictly against the registry and narrowed by the service identity
 * `S`. Pass `<any>` to opt out of scoping (e.g., in tests) — the
 * `any extends X` conditional resolves to truthy for every entry, so
 * `TypedBroker<any>` is effectively unscoped while still being
 * explicit at the call site.
 */
export type TypedBroker<S extends string> = Omit<
  ServiceBroker,
  'call' | 'emit' | 'broadcast' | 'broadcastLocal' | 'publish'
> & {
  call<T extends CallableBy<S>>(
    name: T,
    ...args: CallArgs<T>
  ): Promise<ActionReturns<T>>;

  emit<T extends EmittableBy<S>>(name: T, ...args: EmitArgs<T>): Promise<void>;

  broadcast<T extends EmittableBy<S>>(
    name: T,
    ...args: EmitArgs<T>
  ): Promise<void>;

  broadcastLocal<T extends EmittableBy<S>>(
    name: T,
    ...args: EmitArgs<T>
  ): Promise<void>;

  publish<T extends PublishableBy<S>>(
    name: T,
    ...args: ChannelArgs<T>
  ): Promise<void>;
};

/**
 * Type-narrowing factory. Returns the same broker instance, just typed
 * as `TypedBroker<S>`. Runtime is unchanged — moleculer 0.15's
 * `ServiceBroker` (with the channels middleware injecting `publish`).
 */
export function createTypedBroker<S extends string>(
  broker: ServiceBroker
): TypedBroker<S> {
  return broker as unknown as TypedBroker<S>;
}
