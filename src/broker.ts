/**
 * `ScopedBroker<S>` — `TypedBroker` with `emit`/`broadcast`/
 * `broadcastLocal`/`publish` further narrowed to entries whose
 * `emittedBy` / `publishedBy` includes the service identity `S`.
 *
 * Usage:
 *
 *     import { createScopedBroker } from 'typed-moleculer';
 *     const broker = createScopedBroker<'users'>(new ServiceBroker(opts));
 *     broker.emit('users.created', payload);     // OK
 *     broker.emit('orders.placed', payload);     // TS error
 *
 * Inside service handlers, type your Context's `broker` as
 * `ScopedBroker<S>` to get emit-ownership enforcement on `ctx.broker.X`
 * automatically.
 */

import type { CallingOptions, ServiceBroker } from 'moleculer';

import type {
  ActionName,
  ActionParams,
  ActionReturns,
  ChannelPayload,
  EmittableBy,
  EventPayload,
  PublishableBy
} from './registry';
import type { EmitOptions } from './typed.broker';
import type { ChannelPublishOptions } from './types/channel.publish';

/**
 * `ServiceBroker` with `call` typed against the registry and emit/
 * broadcast/broadcastLocal/publish narrowed to events/channels that
 * service `S` is authorized to emit/publish.
 */
export type ScopedBroker<S extends string> = Omit<
  ServiceBroker,
  'call' | 'emit' | 'broadcast' | 'broadcastLocal' | 'publish'
> & {
  call<T extends ActionName>(
    name: T,
    params: ActionParams<T>,
    opts?: CallingOptions
  ): Promise<ActionReturns<T>>;
} & {
  emit<T extends EmittableBy<S>>(
    name: T,
    payload: EventPayload<T>,
    opts?: EmitOptions
  ): Promise<void>;

  broadcast<T extends EmittableBy<S>>(
    name: T,
    payload: EventPayload<T>,
    opts?: EmitOptions
  ): Promise<void>;

  broadcastLocal<T extends EmittableBy<S>>(
    name: T,
    payload: EventPayload<T>,
    opts?: EmitOptions
  ): Promise<void>;

  publish<T extends PublishableBy<S>>(
    name: T,
    payload: ChannelPayload<T>,
    opts?: ChannelPublishOptions
  ): Promise<void>;
};

/**
 * Type-narrowing factory. Returns the same broker instance, just typed
 * as `ScopedBroker<S>`. Runtime is unchanged — moleculer 0.15's
 * `ServiceBroker` (with the channels middleware injecting `publish`).
 */
export function createScopedBroker<S extends string>(
  broker: ServiceBroker
): ScopedBroker<S> {
  return broker as unknown as ScopedBroker<S>;
}
