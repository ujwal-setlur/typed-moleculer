import type { ChannelOptions } from './types';

/**
 * `@Channel` — registers the decorated method as a channels-middleware
 * handler. Consumed by `@moleculer/channels` (and compatible forks)
 * which read the `channels` field on the service schema.
 *
 *     @Channel({ group: 'my-group', maxRetries: 3 })
 *     'orders.placed'(ctx: Context<Order>) {...}
 */
export function Channel(opts: ChannelOptions = {}) {
  return function ChannelDecorator(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): void {
    const channels = (target.channels ??= {});
    channels[propertyKey] = {
      ...opts,
      handler: descriptor.value
    };
  };
}
