/**
 * Type-level tests for `TypedContext<S, ...>`. Verifies that re-typing
 * `Context.broker` as `TypedBroker<S>` propagates strictness AND
 * service-identity scoping to `ctx.broker.X(...)` calls in handler code.
 */

import type { TypedContext } from 'typed-moleculer';

// Side-effect — pull registry contributions into scope.
import './registry.fixtures';

describe('TypedContext<any, ...> — unscoped (full visibility)', () => {
  const ctx = null as unknown as TypedContext<any, { id: string }>;

  test('ctx.broker.call is typed against the registry', async () => {
    const result = await ctx.broker.call('users.getUser', { id: 'u1' });
    type R = typeof result;
    type E = { id: string; email: string; name: string };
    const _check: R extends E ? (E extends R ? true : false) : false = true;
    void _check;
  });

  test('ctx.broker.call rejects unknown action', () => {
    // @ts-expect-error — unknown action
    void ctx.broker.call('does.not.exist', {});
  });

  test('ctx.broker.emit accepts any registered event (unscoped)', () => {
    void ctx.broker.emit('users.created', {
      id: 'u1',
      email: 'a@b.c',
      name: 'A'
    });
    void ctx.broker.emit('orders.placed', {
      id: 'o1',
      userId: 'u1',
      total: 1
    });
  });

  test('ctx.broker.emit rejects unknown event', () => {
    // @ts-expect-error — unknown event
    void ctx.broker.emit('unknown.event', {});
  });

  test('ctx.broker.publish rejects wrong payload', () => {
    // @ts-expect-error — wrong payload
    void ctx.broker.publish('audit.event', { wrong: 'shape' });
  });

  test('ctx.params is typed from generic', () => {
    const id = ctx.params.id;
    const _check: typeof id extends string ? true : false = true;
    void _check;
  });
});

describe('TypedContext<"users", ...> — scoped to users service', () => {
  const ctx = null as unknown as TypedContext<'users', { name: string }>;

  test('ctx.broker can emit own events', () => {
    void ctx.broker.emit('users.created', {
      id: 'u1',
      email: 'a@b.c',
      name: 'A'
    });
  });

  test('ctx.broker CANNOT emit other services events', () => {
    // @ts-expect-error — orders.placed emittedBy='orders'
    void ctx.broker.emit('orders.placed', {
      id: 'o1',
      userId: 'u1',
      total: 1
    });
  });

  test('ctx.broker.call honors callableBy when scoped', async () => {
    // users IS in users.adminTask callableBy
    void (await ctx.broker.call('users.adminTask', { taskId: 't1' }));
  });

  test('ctx.broker.call accepts unrestricted actions', async () => {
    void (await ctx.broker.call('users.getUser', { id: 'u1' }));
    void (await ctx.broker.call('users.ping'));
  });

  test('ctx.broker.publish enforces publishedBy', () => {
    // users IS in audit.event's publishedBy union
    void ctx.broker.publish('audit.event', {
      service: 'users',
      action: 'x',
      at: 0
    });
  });

  test('ctx.params and ctx.meta are still typed from generics', () => {
    const name = ctx.params.name;
    const _check: typeof name extends string ? true : false = true;
    void _check;
  });
});

describe('TypedContext<"orders", ...> — scoped to orders service', () => {
  const ctx = null as unknown as TypedContext<'orders', void>;

  test('ctx.broker.call CANNOT call users.adminTask (callableBy excludes orders)', () => {
    // @ts-expect-error — callableBy='users'|'admin' doesn't include 'orders'
    void ctx.broker.call('users.adminTask', { taskId: 't1' });
  });
});
