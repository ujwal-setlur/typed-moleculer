import {
  GenericActionWithParameters,
  GenericActionWithoutParameters,
  GenericEventWithoutPayload,
  GenericEventWithPayload,
  GenericChannelEventWithoutPayload,
  GenericChannelEventWithPayload
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
  | GenericEventWithPayload<'typedService.event2', { id: string }>;

export type ServiceChannelEvent =
  | GenericChannelEventWithoutPayload<'typedService.channel-event-1', void>
  | GenericChannelEventWithPayload<
      'typedService.channel-event-2',
      string,
      string
    >;
