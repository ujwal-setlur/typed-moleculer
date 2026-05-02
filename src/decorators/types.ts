/**
 * Option shapes for the decorators. Extend moleculer 0.15's strict schema
 * types where applicable, but keep an open `[key: string]: unknown` index
 * signature so user-supplied fields (read by custom middlewares) pass
 * through to the runtime schema without TS errors.
 */

import type { ActionSchema, EventSchema, ServiceSchema } from 'moleculer';

/**
 * `@Service` options — name, mixins, settings, lifecycle hooks. Authored
 * fields populate the `ServiceSchema` directly.
 *
 * `settings` is open-shaped: moleculer 0.15 narrowed `ServiceSettingSchema`
 * to a closed set (`$noVersionPrefix`, `$noServiceNamePrefix`, etc.) but
 * real services routinely add custom settings the runtime reads. We type
 * it permissively so user fields don't trip strict mode.
 */
export type ServiceOptions = Partial<
  Omit<
    ServiceSchema,
    'name' | 'actions' | 'events' | 'channels' | 'methods' | 'settings'
  >
> & {
  /** Service name. Defaults to the class name if omitted. */
  name?: string;
  /** Service settings. Open-shaped — accepts any user-defined fields
   *  alongside moleculer's reserved `$noVersionPrefix` etc. */
  settings?: Record<string, unknown>;
  /** Custom fields read by middlewares. */
  [key: string]: unknown;
};

/**
 * `@Action` options — params validation, cache, tracing, bulkhead, etc.
 * `handler` is supplied by the decorated method's descriptor — don't set
 * it here.
 */
export type ActionOptions = Partial<
  Omit<ActionSchema, 'handler' | 'service' | 'remoteHandler'>
> & {
  /** Custom fields read by middlewares (e.g. `restricted`, `stateChange`). */
  [key: string]: unknown;
};

/**
 * `@Event` options. `handler` comes from the decorated method.
 */
export type EventOptions = Partial<Omit<EventSchema, 'handler' | 'service'>> & {
  /** Custom fields read by middlewares. */
  [key: string]: unknown;
};

/**
 * `@Channel` options — channels-middleware shape. moleculer 0.15's core
 * `ServiceSchema` doesn't define a `channels` field; this shape mirrors
 * what `@moleculer/channels` (and compatible forks) accept on the
 * service schema.
 */
export interface ChannelOptions {
  /** Channel name. Defaults to the decorated method's property key. */
  name?: string;
  /** Consumer group. Defaults to the service's full name. */
  group?: string;
  /** Construct a `Context` for the handler instead of passing raw payload. */
  context?: boolean;
  /** Adapter-specific options (AMQP queue/exchange/consumer options, etc.). */
  amqp?: Record<string, unknown>;
  /** Tracing config, passed through to the channels middleware. */
  tracing?: Record<string, unknown>;
  /** Maximum in-flight messages. */
  maxInFlight?: number;
  /** Maximum delivery attempts before dead-lettering. */
  maxRetries?: number;
  /** Retry interval in milliseconds (AMQP). */
  retryInterval?: number;
  /** Dead-letter queue config. */
  deadLettering?: {
    enabled?: boolean;
    queueName?: string;
    exchangeName?: string;
  };
  /** Custom fields read by middlewares. */
  [key: string]: unknown;
}

/**
 * `@CronJob` options. Consumed by a moleculer cron mixin that reads the
 * `crons` field on the service schema (e.g. `@stretchshop/moleculer-
 * cron` or compatible forks).
 */
export interface CronJobOptions {
  /** Cron expression. */
  cronTime: string;
  /** Time zone, e.g. `'America/Los_Angeles'`. */
  timeZone?: string;
  /** Run once at registration. */
  runOnInit?: () => void;
  /** Set `true` to require explicit start (default `false` — auto-starts). */
  manualStart?: boolean;
}
