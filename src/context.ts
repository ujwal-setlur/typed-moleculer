/**
 * `TypedContext` and `ScopedContext<S>` — moleculer `Context` with the
 * `broker` field re-typed to a strictly typed view.
 *
 * Use these in handler signatures so that `ctx.broker.X(...)` calls are
 * checked against the registry, instead of falling through to
 * moleculer's loose `ServiceBroker.call/emit/...` overloads.
 *
 *     import { ScopedContext } from 'typed-moleculer';
 *
 *     function handler(ctx: ScopedContext<'users', GetUserParams>) {
 *       ctx.broker.call('users.getUser', ctx.params);  // typed
 *       ctx.broker.emit('users.created', userObj);     // scoped emit
 *     }
 */

import type { Context } from 'moleculer';

import type { ScopedBroker } from './scoped.broker';
import type { TypedBroker } from './typed.broker';

/**
 * `Context` with `broker` re-typed as `TypedBroker` — strict typing on
 * call/emit/broadcast/publish, no service-identity scoping.
 */
export type TypedContext<
  TParams = unknown,
  TMeta extends object = object,
  TLocals = Record<string, unknown>,
  THeaders = Record<string, unknown>
> = Omit<Context<TParams, TMeta, TLocals, THeaders>, 'broker'> & {
  broker: TypedBroker;
};

/**
 * `Context` with `broker` re-typed as `ScopedBroker<S>` — strict typing
 * plus emit-ownership for service identity `S`.
 */
export type ScopedContext<
  S extends string,
  TParams = unknown,
  TMeta extends object = object,
  TLocals = Record<string, unknown>,
  THeaders = Record<string, unknown>
> = Omit<Context<TParams, TMeta, TLocals, THeaders>, 'broker'> & {
  broker: ScopedBroker<S>;
};
