/**
 * Type-level tests for the typed broker. Verifies:
 *   - `TypedBroker` strictly types call/emit/broadcast/publish against
 *     the registry (rejects unknown names + wrong payload shapes).
 *   - `ScopedBroker<S>` further narrows emit/broadcast/publish to
 *     entries authorized for service `S` via emittedBy / publishedBy.
 */

import {
  createScopedBroker,
  createTypedBroker,
  type ScopedBroker,
  type TypedBroker
} from 'typed-moleculer';

// Side-effect — pull registry contributions into scope.
import './registry.fixtures';

describe('TypedBroker — strict typing on call/emit/broadcast/publish', () => {
  const broker = null as unknown as TypedBroker;

  test('call: registered action with correct params + typed return', async () => {
    const result = await broker.call('users.getUser', { id: 'u1' });
    type R = typeof result;
    type E = { id: string; email: string; name: string };
    const _check: R extends E ? (E extends R ? true : false) : false = true;
    void _check;
  });

  test('call: action with no params accepts undefined', async () => {
    const result = await broker.call('users.ping', undefined);
    const _check: typeof result extends string ? true : false = true;
    void _check;
  });

  test('call: rejects unknown action', () => {
    // @ts-expect-error — 'does.not.exist' is not in TypedActions
    void broker.call('does.not.exist', {});
  });

  test('call: rejects wrong params shape', () => {
    // @ts-expect-error — wrong params shape for users.getUser
    void broker.call('users.getUser', { wrong: 'shape' });
  });

  test('emit: any registered event accepted (non-scoped)', () => {
    void broker.emit('users.created', {
      id: 'u1',
      email: 'a@b.c',
      name: 'A'
    });
    void broker.emit('orders.placed', {
      id: 'o1',
      userId: 'u1',
      total: 99
    });
  });

  test('emit: rejects unknown event', () => {
    // @ts-expect-error — 'unknown.event' not in TypedEvents
    void broker.emit('unknown.event', {});
  });

  test('emit: rejects wrong payload shape', () => {
    // @ts-expect-error — payload mismatch for users.created
    void broker.emit('users.created', { wrong: 'shape' });
  });

  test('broadcast / broadcastLocal mirror emit', () => {
    void broker.broadcast('users.deleted', { id: 'u1' });
    void broker.broadcastLocal('users.created', {
      id: 'u1',
      email: 'a@b.c',
      name: 'A'
    });
  });

  test('publish: registered channel + correct payload', () => {
    void broker.publish('audit.event', {
      service: 'users',
      action: 'getUser',
      at: Date.now()
    });
    void broker.publish('notifications.send', {
      userId: 'u1',
      message: 'hi'
    });
  });

  test('publish: rejects unknown channel', () => {
    // @ts-expect-error — 'unknown.channel' not in TypedChannels
    void broker.publish('unknown.channel', { x: 1 });
  });

  test('publish: rejects wrong payload shape', () => {
    // @ts-expect-error — wrong payload for audit.event
    void broker.publish('audit.event', { wrong: 'shape' });
  });

  test('createTypedBroker returns a TypedBroker', () => {
    const _b = createTypedBroker(null as any);
    type B = typeof _b;
    const _check: B extends TypedBroker ? true : false = true;
    void _check;
  });
});

describe('ScopedBroker<S> — emit-ownership narrowing', () => {
  describe('users broker', () => {
    const broker = null as unknown as ScopedBroker<'users'>;

    test('users can emit its own events', () => {
      void broker.emit('users.created', {
        id: 'u1',
        email: 'a@b.c',
        name: 'A'
      });
      void broker.emit('users.deleted', { id: 'u1' });
    });

    test('users CANNOT emit inventory.adjusted (not in emittedBy)', () => {
      // @ts-expect-error — 'inventory.adjusted' emittedBy excludes 'users'
      void broker.emit('inventory.adjusted', { sku: 'X', delta: 1 });
    });

    test('users CANNOT emit orders.placed', () => {
      // @ts-expect-error — orders.placed emittedBy='orders'
      void broker.emit('orders.placed', {
        id: 'o1',
        userId: 'u1',
        total: 1
      });
    });

    test('users can publish to audit.event and notifications.send', () => {
      void broker.publish('audit.event', {
        service: 'users',
        action: 'x',
        at: 0
      });
      void broker.publish('notifications.send', {
        userId: 'u1',
        message: 'hi'
      });
    });

    test('call is unscoped — users can call any registered action', async () => {
      void (await broker.call('users.getUser', { id: 'u1' }));
      void (await broker.call('users.ping', undefined));
    });

    test('createScopedBroker returns a ScopedBroker<S>', () => {
      const _b = createScopedBroker<'users'>(null as any);
      type B = typeof _b;
      const _check: B extends ScopedBroker<'users'> ? true : false = true;
      void _check;
    });
  });

  describe('orders broker', () => {
    const broker = null as unknown as ScopedBroker<'orders'>;

    test('orders can emit its own events', () => {
      void broker.emit('orders.placed', {
        id: 'o1',
        userId: 'u1',
        total: 1
      });
    });

    test('orders can emit shared inventory.adjusted (multi-emitter)', () => {
      void broker.emit('inventory.adjusted', { sku: 'X', delta: -1 });
    });

    test('orders CANNOT emit users.created', () => {
      // @ts-expect-error — emittedBy='users'
      void broker.emit('users.created', {
        id: 'u1',
        email: 'a@b.c',
        name: 'A'
      });
    });
  });

  describe('inventory broker', () => {
    const broker = null as unknown as ScopedBroker<'inventory'>;

    test('inventory can emit only inventory.adjusted', () => {
      void broker.emit('inventory.adjusted', { sku: 'X', delta: 1 });
    });

    test('inventory CANNOT publish to notifications.send', () => {
      // @ts-expect-error — notifications.send publishedBy excludes 'inventory'
      void broker.publish('notifications.send', {
        userId: 'u1',
        message: 'hi'
      });
    });

    test('inventory can publish to audit.event', () => {
      void broker.publish('audit.event', {
        service: 'inventory',
        action: 'adjust',
        at: 0
      });
    });
  });
});
