/**
 * `@Service` — class decorator that assembles a moleculer `ServiceSchema`
 * from the decorated class and attaches it via `super(broker, schema)` at
 * instantiation time.
 *
 *     @Service({ name: 'users', mixins: [...] })
 *     class UsersService extends moleculer.Service {
 *       @Action()
 *       getUser(ctx: Context) {...}
 *
 *       @Event()
 *       'users.created'(ctx: Context) {...}
 *
 *       @Method
 *       helper() {...}
 *     }
 *
 *     // Used as: broker.createService(UsersService);
 *
 * Method-level decorators (`@Action`, `@Event`, `@Channel`, `@Method`,
 * `@CronJob`) populate `target.{actions,events,channels,methods,crons}`
 * on the class prototype before this decorator runs. We read those fields
 * here, build a `ServiceSchema`, and wrap the constructor.
 */

import type { ServiceBroker, ServiceSchema } from 'moleculer';

import moleculer from 'moleculer';

import type { ServiceOptions } from './types';

type AnyConstructor = new (...args: any[]) => any;

interface DecoratedPrototype {
  actions?: Record<string, unknown>;
  events?: Record<string, unknown>;
  channels?: Record<string, unknown>;
  methods?: Record<string, unknown>;
  crons?: unknown[];
  created?: (broker: ServiceBroker) => void;
  started?: () => Promise<void> | void;
  stopped?: () => Promise<void> | void;
  // moleculer-db lifecycle hooks
  afterConnected?: () => Promise<void> | void;
  entityCreated?: (...args: unknown[]) => Promise<void> | void;
  entityUpdated?: (...args: unknown[]) => Promise<void> | void;
  entityRemoved?: (...args: unknown[]) => Promise<void> | void;
}

const LIFECYCLE_HOOKS = [
  'created',
  'started',
  'stopped',
  'afterConnected',
  'entityCreated',
  'entityUpdated',
  'entityRemoved'
] as const;

export function Service(opts: ServiceOptions = {}) {
  return function ServiceDecorator<T extends AnyConstructor>(
    constructor: T
  ): T {
    const proto = constructor.prototype as DecoratedPrototype;

    const baseSchema: ServiceSchema & Record<string, unknown> = {
      name: opts.name ?? constructor.name,
      ...(opts as Record<string, unknown>)
    };

    // Method-decorator output. Cast each assignment — the prototype's
    // collected entries are open-shaped (`Record<string, unknown>`) while
    // moleculer's strict 0.15 schema fields demand specific value types
    // (`ServiceMethod`, `ServiceAction`, `EventSchema`). We trust the
    // method decorators to have produced compatible shapes.
    const writable = baseSchema as Record<string, unknown>;
    if (proto.actions) writable.actions = { ...proto.actions };
    if (proto.events) writable.events = { ...proto.events };
    if (proto.channels) writable.channels = { ...proto.channels };
    if (proto.methods) writable.methods = { ...proto.methods };
    if (proto.crons) writable.crons = [...proto.crons];

    // Lifecycle hooks declared as class methods (not via decorators).
    // Includes moleculer-db's afterConnected / entityCreated / etc.
    // Cast through unknown — moleculer types `created`/`started`/`stopped`
    // with strict `(this: TThis)` lifecycle handler signatures that don't
    // match the open prototype shape.
    for (const hook of LIFECYCLE_HOOKS) {
      const fn = proto[hook];
      if (typeof fn === 'function') {
        (baseSchema as Record<string, unknown>)[hook] = fn;
      }
    }

    // Wrap constructor: invoking `new Wrapped(broker)` calls
    // `super(broker, baseSchema)` so moleculer's Service constructor
    // sees the assembled schema.
    class Wrapped extends (constructor as AnyConstructor) {
      constructor(broker: ServiceBroker) {
        super(broker);
        // moleculer.Service's constructor accepts an optional schema;
        // call parseServiceSchema explicitly with our assembled schema.
        (this as unknown as moleculer.Service).parseServiceSchema(baseSchema);
      }
    }

    // Preserve the original class name for debugging / introspection.
    Object.defineProperty(Wrapped, 'name', {
      value: opts.name ?? constructor.name,
      configurable: true
    });

    return Wrapped as T;
  };
}
