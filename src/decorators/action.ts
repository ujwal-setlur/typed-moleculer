import type { ActionOptions } from './types';

/**
 * `@Action` — registers the decorated method as a moleculer action.
 *
 *     @Action({ params: { id: 'string' }, cache: false })
 *     getThing(ctx: Context<{ id: string }>) {...}
 *
 * The decorated method's body becomes the action handler. `opts` flow
 * through to the action's `ServiceSchema` entry verbatim — including any
 * custom fields (e.g., `restricted`, `stateChange`) that middlewares
 * read.
 */
export function Action(opts: ActionOptions = {}) {
  return function ActionDecorator(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): void {
    const actions = (target.actions ??= {});
    actions[propertyKey] = {
      ...opts,
      handler: descriptor.value
    };
  };
}
