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
    params: ActionParams<T>,
    opts?: CallingOptions
  ): Promise<ActionReturns<T>>;

  emit<T extends EventName>(
    name: T,
    payload: EventPayload<T>,
    opts?: EmitOptions
  ): Promise<void>;

  broadcast<T extends EventName>(
    name: T,
    payload: EventPayload<T>,
    opts?: EmitOptions
  ): Promise<void>;

  broadcastLocal<T extends EventName>(
    name: T,
    payload: EventPayload<T>,
    opts?: EmitOptions
  ): Promise<void>;

  publish<T extends ChannelName>(
    name: T,
    payload: ChannelPayload<T>,
    opts?: ChannelPublishOptions
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
