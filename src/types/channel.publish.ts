import type { Context } from 'moleculer';

/**
 * Options for `broker.publish(...)`. Mirrors `@moleculer/channels`'s
 * publish-call surface, narrowed to AMQP-relevant fields. Adapter-specific
 * extras are accepted via the `[key: string]: unknown` index signature.
 *
 * The runtime `publish` method is provided by the channels middleware,
 * not by typed-moleculer or moleculer itself. typed-moleculer only types
 * the call signature.
 */
export interface ChannelPublishOptions {
  /** If truthy, the payload won't be serialized. */
  raw?: boolean;
  /** AMQP: if truthy, message survives broker restarts (queue must too). */
  persistent?: boolean;
  /** AMQP: discard from queue after this many ms. */
  ttl?: number;
  /** AMQP: message priority. */
  priority?: number;
  /** AMQP: request identifier. */
  correlationId?: string;
  /**
   * Calling Context. The channels middleware uses this for tracing,
   * meta serialization, and channelName injection.
   *
   * `broker` and the `call`/`emit`/`broadcast` methods are widened to
   * `unknown` so a `TypedContext<S, ...>` (whose broker is
   * `TypedBroker<S>` and whose call/emit/broadcast carry strict registry
   * overloads not assignable to moleculer's loose ones) can still be
   * passed through here. The runtime channels middleware reads only
   * `meta`, `requestID`, `id`, `tracing`, `level`, `service.fullName`,
   * `currentChannelName`, and `headers` from this object — broker shape
   * and the call/emit/broadcast signatures are never accessed.
   */
  ctx?: Omit<Context, 'broker' | 'call' | 'emit' | 'broadcast'> & {
    broker: unknown;
    call: unknown;
    emit: unknown;
    broadcast: unknown;
  };
  /** Application-specific headers carried with the message. */
  headers?: Record<string, unknown>;
  /** AMQP: routing key. If publishing to a queue (no exchange), set
   *  channelName to "" and queue name as routingKey. */
  routingKey?: string | Record<string, unknown>;
  /** AMQP: assert the exchange before publishing. */
  publishAssertExchange?: {
    enabled?: boolean;
    exchangeOptions?: Record<string, unknown>;
  };
  /** Adapter-specific extras (Kafka key/partition/acks/timeout/compression,
   *  custom adapters, etc.) — pass through untyped. */
  [key: string]: unknown;
}
