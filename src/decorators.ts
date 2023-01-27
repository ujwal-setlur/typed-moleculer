import {
  ServiceSchema,
  ServiceBroker,
  ServiceEventHandler,
  EventSchema,
  GenericObject
} from 'moleculer';

import * as _ from './util';

const blacklist = [
  'created',
  'started',
  'stopped',
  'actions',
  'methods',
  'events',
  'broker',
  'logger',
  'crons',
  'channels'
];
const blacklist2 = ['metadata', 'settings', 'mixins', 'name', 'version'].concat(
  blacklist
);
const defaultServiceOptions: Options = {
  constructOverride: true,
  skipHandler: false // not needed, just for clarity
};

export interface Options extends Partial<ServiceSchema> {
  name?: string;
  constructOverride?: boolean;
}

export interface EventOptions extends Partial<EventSchema> {
  name?: string;
  group?: string;
  handler?: ServiceEventHandler; // not really used
}

export function Method(target, key: string, descriptor: PropertyDescriptor) {
  (target.methods || (target.methods = {}))[key] = descriptor.value;
}

export function Event(options?: EventOptions) {
  return function (target, key: string, descriptor: PropertyDescriptor) {
    (target.events || (target.events = {}))[key] = options
      ? {
          ...options,
          handler: descriptor.value
        }
      : descriptor.value;
  };
}

// support for @moleculer/channels
export type ChannelHandler = (
  payload: any,
  rawMessage: any
) => void | Promise<void>;
export interface ChannelOptions {
  group?: string;
  maxInFlight?: number;
  maxRetries?: number;
  deadLettering?: {
    enabled?: boolean;
    queueName?: string;
  };
  handler?: ChannelHandler; // not really used since we use the descriptor value below
  redis?: {
    startID?: string;
    minIdleTime?: number;
    claimInterval: number;
    readTimeoutInterval: number;
    processingAttemptsInterval?: number;
  };
  amqp?: {
    queueOptions?: GenericObject;
    exchangeOptions?: GenericObject;
    consumerOptions?: GenericObject;
  };
  nats?: {
    consumerOptions?: GenericObject;
    streamConfig?: GenericObject;
  };
  kafka?: {
    fromBeginning?: boolean;
    partitionsConsumedConcurrently?: number;
  };
}

export function Channel(options?: ChannelOptions): MethodDecorator {
  return function ChannelDecorator(
    target: any,
    key: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    (target.channels || (target.channels = {}))[key] = options
      ? {
          ...options,
          handler: descriptor.value
        }
      : descriptor.value;
  };
}

export { Action, ActionOptions } from './action.decorator';

// -------------------------------------------------

export type CronJobOptions = {
  cronTime: string;
  timeZone?: string;
  runOnInit?: () => void;
  /** Leave default or set `false` to start automatically */
  manualStart?: boolean;
};

export function CronJob(options: CronJobOptions): MethodDecorator {
  return function CronJobDecorator(
    target: any,
    key: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    (target.crons || (target.crons = [])).push({
      name: key,
      onTick: descriptor.value,
      manualStart: false,
      ...options
    });
  };
}

// -------------------------------------------------

// Instead of using moleculer's ServiceBroker, we will fake the broker class to pass it to service constructor
const mockServiceBroker = new Object({ Promise });

export function Service<T extends Options>(opts: T = {} as T): Function {
  const options = opts || ({} as Options);
  return function (constructor: Function) {
    const base: ServiceSchema = {
      name: '' // will be overridden
    };
    const _options = Object.assign({}, defaultServiceOptions, options);

    Object.defineProperty(base, 'name', {
      value: options.name || constructor.name,
      writable: false,
      enumerable: true
    });

    if (options.name) {
      delete options.name; // not needed
    }

    Object.assign(base, _.omit(options, Object.keys(defaultServiceOptions))); // Apply

    const parentService = constructor.prototype;
    const vars = [];
    Object.getOwnPropertyNames(parentService).forEach(function (key) {
      if (key === 'constructor') {
        if (_options.constructOverride) {
          // Override properties defined in @Service
          const ServiceClass = new parentService.constructor(mockServiceBroker);

          Object.getOwnPropertyNames(ServiceClass).forEach(function (aKey) {
            if (
              blacklist.indexOf(aKey) === -1 &&
              !_.isFunction(ServiceClass[aKey])
            ) {
              base[aKey] = Object.getOwnPropertyDescriptor(
                ServiceClass,
                aKey
              )!.value;
              if (blacklist2.indexOf(aKey) === -1) {
                // Needed, otherwize if the service is used as a mixin, these variables will overwrite the toplevel's
                vars[aKey] = Object.getOwnPropertyDescriptor(
                  ServiceClass,
                  aKey
                )!.value;
              }
            }
          });

          /* Insane hack below :D
           * It's needed since moleculer don't transfer all defined props in the schema to the actual service, so we have to do it.
           * Side note: This is quite hacky and would be a performance loss if the created function would be called over and over, since it's called once, it's more than fine :)
           */

          const bypass: any = Object.defineProperty; // typescript fix
          const obj: any = {}; // placeholder

          // Defining our 'own' created function
          bypass(obj, 'created', {
            value: function created(broker: ServiceBroker) {
              for (const aKey in vars) {
                this[aKey] = vars[aKey];
              }

              // Check if user defined a created function, if so, we need to call it after ours.
              if (
                Object.getOwnPropertyDescriptor(parentService, 'created') !=
                null
              ) {
                Object.getOwnPropertyDescriptor(
                  parentService,
                  'created'
                )?.value.call(this, broker);
              }
            },
            writable: true,
            enumerable: true,
            configurable: true
          });

          base['created'] = obj.created;
        }
        return;
      }

      const descriptor = Object.getOwnPropertyDescriptor(parentService, key)!;

      if (key === 'created' && !_options.constructOverride) {
        base[key] = descriptor.value;
      }

      if (key === 'started' || key === 'stopped') {
        base[key] = descriptor.value;
        return;
      }

      if (
        key === 'events' ||
        key === 'methods' ||
        key === 'actions' ||
        key === 'crons' ||
        key === 'channels'
      ) {
        base[key]
          ? Object.assign(base[key], descriptor.value)
          : (base[key] = descriptor.value);
        return;
      }

      // moleculer-db lifecycle methods (https://github.com/ColonelBundy/moleculer-decorators/issues/2)
      if (
        key === 'afterConnected' ||
        key === 'entityCreated' ||
        key === 'entityUpdated' ||
        key === 'entityRemoved'
      ) {
        base[key] = descriptor.value;
        return;
      }
    });

    return class extends parentService.constructor {
      constructor(broker, schema) {
        super(broker, schema);
        this.parseServiceSchema(base);
      }
    };
  };
}
