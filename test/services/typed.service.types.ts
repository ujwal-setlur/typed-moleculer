import {
  GenericActionWithParameters,
  GenericActionWithoutParameters,
  GenericEventWithoutPayload,
  GenericEventWithPayload
} from '../../index'; // eslint-disable-line import/extensions

export type ServiceName = 'typedService';
export const serviceName: ServiceName = 'typedService';

export type ServiceAction =
  | GenericActionWithoutParameters<'typedService.hello', string>
  | GenericActionWithParameters<
      'typedService.boo',
      { foo: string; bar?: string },
      string
    >
  | GenericActionWithParameters<
      'typedService.welcome',
      { name: string },
      string
    >;

export type ServiceEvent =
  | GenericEventWithoutPayload<'typedService.event1'>
  | GenericEventWithPayload<'typedService.event2', { id: string }>
  | GenericEventWithoutPayload<'typedService.channel-event-1'>
  | GenericEventWithPayload<'typedService.channel-event-2', string>
  | GenericEventWithPayload<'typedService.channel-with-context', string>
  | GenericEventWithPayload<
      'typedService.channel-with-context-and-tracing',
      object
    >;
