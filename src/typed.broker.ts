/* istanbul ignore file */
/* eslint-disable no-use-before-define */
// Moleculer micro-services framework
import moleculer, { GenericObject } from 'moleculer';

// Action interfaces

// All actions should have this interface
interface ActionInterface {
  name: string;
  returns: unknown;
}

// Actions with parameters should have this interface
interface ActionWithParametersInterface extends ActionInterface {
  parameters: GenericObject;
}

// Event interfaces

interface EventInterface {
  name: string;
}

interface EventWithPayloadInterface extends EventInterface {
  payload: any;
}

// Action type utilities

// Get simple action type from list of action type
type ActionWithoutParameters<A extends ActionInterface> =
  A extends ActionWithParametersInterface
    ? never
    : A extends EventInterface
    ? Exclude<keyof A, keyof ActionInterface> extends never
      ? A
      : never
    : never;

// action with params
type ActionWithParameters<A extends ActionInterface> =
  A extends ActionWithParametersInterface ? A : never;

// Get the parameters type for an ActionWithParameters type
type ActionParameters<A, T> = A extends ActionWithParametersInterface
  ? Extract<A, { name: T }>['parameters']
  : never;

// Get the return type for an ActionWithParameters type
type ActionReturns<A, T> = A extends ActionInterface
  ? Extract<A, { name: T }>['returns']
  : never;

// Get action name type from a list of action types
type ActionName<A extends ActionInterface> = A['name'];

// Get action name types for event types without payload
type ActionNameWithoutParameters<A extends ActionInterface> =
  ActionWithoutParameters<A>['name'];

// Get action name types for event types with payload
type ActionNameWithParameters<A extends ActionInterface> =
  ActionWithParameters<A>['name'];

// Event type utilities

// Get simple event type from list of event type
type EventWithoutPayload<E extends EventInterface> =
  E extends EventWithPayloadInterface
    ? never
    : E extends EventInterface
    ? Exclude<keyof E, keyof EventInterface> extends never
      ? E
      : never
    : never;

// Get payload event type from list of event types
type EventWithPayload<E extends EventInterface> =
  E extends EventWithPayloadInterface ? E : never;

// Get the payload type for an EventWithPayload type
type EventPayload<E, T> = E extends EventWithPayloadInterface
  ? Extract<E, { name: T }>['payload']
  : never;

// Get event name types for event types without payload
type EventNameWithoutPayload<E extends EventInterface> =
  EventWithoutPayload<E>['name'];

// Get event name types for event types with payload
type EventNameWithPayload<E extends EventInterface> =
  EventWithPayload<E>['name'];

// Channel event type utilities

type ChannelPublishOptions = {
  raw?: boolean /* If truthy, the payload won't be serialized */;
  peristent?: boolean /* AMQP: If truthy, the message will survive broker restarts provided it’s in a queue that also survives restarts */;
  ttl?: number /* AMQP: If supplied, the message will be discarded from a queue once it’s been there longer than the given number of milliseconds */;
  priority?: number /* AMQP: Priority of the message */;
  correlationId?: string /* AMQP: Request identifier */;
  ctx?: moleculer.Context;
  headers?: GenericObject /* Application specific headers to be carried along with the message content */;
  routingKey?: GenericObject /* AMQP: The AMQP publish method's second argument. If you want to send the message into an external queue instead of exchange, set the channelName to "" and set the queue name to routingKey */;
  publishAssertExchange?: {
    enabled?: boolean;
    exchangeOptions: GenericObject;
  };
  key?: string /* Kafka: Key of Kafka message */;
  partition?: string /* Kafka: Partition of Kafka message */;
  acks?: number /* Kafka: Control the number of required acks */;
  timeout?: number /* Kafka: The time to await a response in ms. Default: 30000 */;
  compression?: any /* Kafka: Compression codec. Default: CompressionTypes.None */;
};

// Our exports

// Our main action type generics
export type GenericActionWithoutParameters<N extends string, R extends any> = {
  name: N;
  returns: R;
};

export type GenericActionWithParameters<
  N extends string,
  P extends GenericObject,
  R extends any
> = {
  name: N;
  parameters: P;
  returns: R;
};

// Our main event type generics
export type GenericEventWithoutPayload<N extends string> = {
  name: N;
};

export type GenericEventWithPayload<N extends string, P extends any> = {
  name: N;
  payload: P;
};

// Our typed generic moleculer broker
export class TypedServiceBroker<
  A extends ActionInterface,
  E extends EventInterface,
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  S extends string,
  M extends GenericObject = GenericObject
> extends moleculer.ServiceBroker {
  // Overload our call functions to type them
  public call<T extends ActionNameWithoutParameters<A>>(
    name: T,
    params?: undefined,
    opts?: moleculer.CallingOptions & {
      meta?: M;
    }
  ): Promise<ActionReturns<A, T>>;

  // eslint-disable-next-line no-dupe-class-members
  public call<T extends ActionNameWithParameters<A>>(
    name: T,
    params: ActionParameters<A, T>,
    opts?: moleculer.CallingOptions & {
      meta?: M;
    }
  ): Promise<ActionReturns<A, T>>;

  // eslint-disable-next-line no-dupe-class-members
  public call<T extends ActionName<A>>(
    name: T,
    params?: ActionParameters<A, T>,
    opts?: moleculer.CallingOptions & {
      meta?: M;
    }
  ): Promise<ActionReturns<A, T>> {
    return super.call(name, <any>params, opts);
  }

  // Overload our emit functions to type them
  public emit<T extends EventNameWithoutPayload<E>>(
    name: T,
    payload?: undefined,
    groups?: string | Array<string>
  ): Promise<void>;

  // eslint-disable-next-line no-dupe-class-members
  public emit<T extends EventNameWithoutPayload<E>>(
    name: T,
    payload?: undefined,
    opts?: GenericObject
  ): Promise<void>;

  // eslint-disable-next-line no-dupe-class-members
  public emit<T extends EventNameWithPayload<E>>(
    name: T,
    payload: EventPayload<E, T>,
    groups?: string | Array<string>
  ): Promise<void>;

  // eslint-disable-next-line no-dupe-class-members
  public emit<T extends EventNameWithPayload<E>>(
    name: T,
    payload: EventPayload<E, T>,
    opts?: moleculer.GenericObject
  ): Promise<void>;

  // eslint-disable-next-line no-dupe-class-members
  public emit(name: any, payload?: any, opts?: any): Promise<void> {
    return super.emit(name, payload, opts);
  }

  // Overload our broadcast functions to type them
  public broadcast<T extends EventNameWithoutPayload<E>>(
    name: T,
    payload?: undefined,
    groups?: string | Array<string>
  ): Promise<void>;

  // eslint-disable-next-line no-dupe-class-members
  public broadcast<T extends EventNameWithoutPayload<E>>(
    name: T,
    payload?: undefined,
    opts?: GenericObject
  ): Promise<void>;

  // eslint-disable-next-line no-dupe-class-members
  public broadcast<T extends EventNameWithPayload<E>>(
    name: T,
    payload: EventPayload<E, T>,
    groups?: string | Array<string>
  ): Promise<void>;

  // eslint-disable-next-line no-dupe-class-members
  public broadcast<T extends EventNameWithPayload<E>>(
    name: T,
    payload: EventPayload<E, T>,
    opts?: moleculer.GenericObject
  ): Promise<void>;

  // eslint-disable-next-line no-dupe-class-members
  public broadcast(name: any, payload?: any, opts?: any): Promise<void> {
    return super.broadcast(name, payload, opts);
  }

  // Overload our broadcastLocal functions to type them
  public broadcastLocal<T extends EventNameWithoutPayload<E>>(
    name: T,
    payload?: undefined,
    groups?: string | Array<string>
  ): Promise<void>;

  // eslint-disable-next-line no-dupe-class-members
  public broadcastLocal<T extends EventNameWithoutPayload<E>>(
    name: T,
    payload?: undefined,
    opts?: GenericObject
  ): Promise<void>;

  // eslint-disable-next-line no-dupe-class-members
  public broadcastLocal<T extends EventNameWithPayload<E>>(
    name: T,
    payload: EventPayload<E, T>,
    groups?: string | Array<string>
  ): Promise<void>;

  // eslint-disable-next-line no-dupe-class-members
  public broadcastLocal<T extends EventNameWithPayload<E>>(
    name: T,
    payload: EventPayload<E, T>,
    opts?: moleculer.GenericObject
  ): Promise<void>;

  // eslint-disable-next-line no-dupe-class-members
  public broadcastLocal(name: any, payload?: any, opts?: any): Promise<void> {
    return super.broadcastLocal(name, payload, opts);
  }

  // Define a function to send channel messages
  // This is the typed version of sendToChannel
  // eslint-disable-next-line no-dupe-class-members
  public publish<T extends EventNameWithoutPayload<E>>(
    name: T,
    payload?: undefined,
    opts?: ChannelPublishOptions
  ): Promise<void>;

  // eslint-disable-next-line no-dupe-class-members
  public publish<T extends EventNameWithPayload<E>>(
    name: T,
    payload: EventPayload<E, T>,
    opts?: ChannelPublishOptions
  ): Promise<void>;

  // eslint-disable-next-line no-dupe-class-members
  public publish(name: any, payload?: any, opts?: any): Promise<void> {
    // We expect the channels middlware config to set the default sendMethodName = sendToChannel
    // This will break if it is set to anything else. We cannot dynamically detect it
    return this.sendToChannel(name, payload, opts);
  }
}
