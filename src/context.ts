/**
 * `TypedContext<S, ...>` — moleculer `Context` with the `broker` field
 * re-typed as `TypedBroker<S>`.
 *
 * Use this in handler signatures so that `ctx.broker.X(...)` calls are
 * checked against the registry under service identity `S`, instead of
 * falling through to moleculer's loose `ServiceBroker.call/emit/...`
 * overloads.
 *
 *     import { TypedContext } from 'typed-moleculer';
 *
 *     function handler(ctx: TypedContext<'users', GetUserParams>) {
 *       ctx.broker.call('users.getUser', ctx.params);
 *       ctx.broker.emit('users.created', userObj);  // scoped — must
 *                                                    // include 'users'
 *                                                    // in emittedBy
 *     }
 *
 * No default for `S` — pass `<any>` deliberately to opt out of
 * scoping.
 */

import type { Context } from 'moleculer';

import type { TypedBroker } from './typed.broker';

export type TypedContext<
  S extends string,
  TParams = unknown,
  TMeta extends object = object,
  TLocals = Record<string, unknown>,
  THeaders = Record<string, unknown>
> = Omit<Context<TParams, TMeta, TLocals, THeaders>, 'broker'> & {
  broker: TypedBroker<S>;
};
