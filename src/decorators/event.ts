import type { EventOptions } from './types';

/**
 * `@Event` — registers the decorated method as a moleculer event handler.
 * The method name is the event name. Property keys can be any string,
 * including dotted/namespaced names:
 *
 *     @Event({ params: { userId: 'string' } })
 *     'users.created'(ctx: Context<{ userId: string }>) {...}
 *
 * moleculer 0.15 removed the legacy `(payload, sender, eventName)`
 * positional handler signature — handlers receive a `Context` only:
 * `ctx.params` (payload), `ctx.eventName`, `ctx.nodeID` (sender).
 */
export function Event(opts: EventOptions = {}) {
  return function EventDecorator(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): void {
    const events = (target.events ??= {});
    events[propertyKey] = {
      ...opts,
      handler: descriptor.value
    };
  };
}
