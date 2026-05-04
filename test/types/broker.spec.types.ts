/**
 * Type-level tests for `TypedBroker<S>`. Verifies:
 *   - Strict typing on call/emit/broadcast/publish against the registry
 *     (rejects unknown names + wrong payload shapes).
 *   - Service-identity narrowing via callableBy / emittedBy / publishedBy.
 *   - Optional authorization fields fall through to "anyone may use" for
 *     entries that omit them.
 *   - `<any>` opts out of scoping (full visibility).
 */

import { createTypedBroker, type TypedBroker } from 'typed-moleculer';

// Side-effect — pull registry contributions into scope.
import './registry.fixtures';

describe('TypedBroker<any> — unscoped (full visibility)', () => {
  const broker = null as unknown as TypedBroker<any>;

  test('call: registered action with correct params + typed return', async () => {
    const result = await broker.call('users.getUser', { id: 'u1' });
    type R = typeof result;
    type E = { id: string; email: string; name: string };
    const _check: R extends E ? (E extends R ? true : false) : false = true;
    void _check;
  });

  test('call: void-params action accepts no params arg (or undefined)', async () => {
    const r1 = await broker.call('users.ping');
    const r2 = await broker.call('users.ping', undefined);
    const _check1: typeof r1 extends string ? true : false = true;
    const _check2: typeof r2 extends string ? true : false = true;
    void _check1;
    void _check2;
  });

  test('call: payload-bearing action still requires params', () => {
    // @ts-expect-error — users.getUser has real params, must pass them
    void broker.call('users.getUser');
  });

  test('call: rejects unknown action', () => {
    // @ts-expect-error — 'does.not.exist' is not in TypedActions
    void broker.call('does.not.exist', {});
  });

  test('call: rejects wrong params shape', () => {
    // @ts-expect-error — wrong params shape for users.getUser
    void broker.call('users.getUser', { wrong: 'shape' });
  });

  test('call: <any> bypasses callableBy authorization', async () => {
    // users.adminTask has callableBy='users'|'admin'. Unscoped broker
    // can still reach it.
    void (await broker.call('users.adminTask', { taskId: 't1' }));
  });

  test('emit: any registered event accepted (unscoped)', () => {
    void broker.emit('users.created', { id: 'u1', email: 'a@b.c', name: 'A' });
    void broker.emit('orders.placed', { id: 'o1', userId: 'u1', total: 99 });
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

  test('emit/broadcast: void-payload event accepts no payload arg', () => {
    void broker.emit('cache.invalidate');
    void broker.broadcast('cache.invalidate');
    void broker.broadcastLocal('cache.invalidate');
    void broker.broadcast('cache.invalidate', undefined, { groups: ['g1'] });
  });

  test('emit: payload still required for non-void events', () => {
    // @ts-expect-error — users.created has a real payload, must pass it
    void broker.emit('users.created');
  });

  test('publish: void-payload channel accepts no payload arg', () => {
    void broker.publish('system.heartbeat');
    void broker.publish('system.heartbeat', undefined, { persistent: true });
  });

  test('publish: payload still required for non-void channels', () => {
    // @ts-expect-error — audit.event has a real payload, must pass it
    void broker.publish('audit.event');
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

  test('TypedDeliverables: dual-mode entry reachable via emit AND publish', () => {
    // 'system.digest' is declared once in TypedDeliverables; flows to
    // both EventName and ChannelName via the helper-type traversal.
    void broker.emit('system.digest', { digestId: 'd1', events: 5 });
    void broker.broadcast('system.digest', { digestId: 'd1', events: 5 });
    void broker.publish('system.digest', { digestId: 'd1', events: 5 });
  });

  test('TypedDeliverables: payload-shape mismatch rejected on both paths', () => {
    // @ts-expect-error — wrong payload shape on emit path
    void broker.emit('system.digest', { wrong: 'shape' });
    // @ts-expect-error — wrong payload shape on publish path
    void broker.publish('system.digest', { wrong: 'shape' });
  });

  test('createTypedBroker<any> returns a TypedBroker<any>', () => {
    const _b = createTypedBroker<any>(null as any);
    type B = typeof _b;
    const _check: B extends TypedBroker<any> ? true : false = true;
    void _check;
  });
});

describe('TypedBroker<"users"> — scoped to users service', () => {
  const broker = null as unknown as TypedBroker<'users'>;

  test('call: unrestricted actions remain callable', async () => {
    void (await broker.call('users.getUser', { id: 'u1' }));
    void (await broker.call('users.ping'));
  });

  test('call: callableBy=users|admin allows users to call', async () => {
    void (await broker.call('users.adminTask', { taskId: 't1' }));
  });

  test('emit: users can emit its own events', () => {
    void broker.emit('users.created', { id: 'u1', email: 'a@b.c', name: 'A' });
    void broker.emit('users.deleted', { id: 'u1' });
  });

  test('emit: users CANNOT emit inventory.adjusted (not in emittedBy)', () => {
    // @ts-expect-error — 'inventory.adjusted' emittedBy excludes 'users'
    void broker.emit('inventory.adjusted', { sku: 'X', delta: 1 });
  });

  test('emit: users CANNOT emit orders.placed', () => {
    // @ts-expect-error — orders.placed emittedBy='orders'
    void broker.emit('orders.placed', { id: 'o1', userId: 'u1', total: 1 });
  });

  test('emit: users can emit unrestricted events (metrics.tick has no emittedBy)', () => {
    void broker.emit('metrics.tick');
  });

  test('publish: users can publish to authorized channels', () => {
    void broker.publish('audit.event', {
      service: 'users',
      action: 'x',
      at: 0
    });
    void broker.publish('notifications.send', { userId: 'u1', message: 'hi' });
  });

  test('publish: users can publish unrestricted channels (metrics.report has no publishedBy)', () => {
    void broker.publish('metrics.report', { metric: 'm', value: 1 });
  });

  test('void-payload events with no payload arg', () => {
    void broker.emit('cache.invalidate');
    void broker.broadcast('cache.invalidate');
    void broker.publish('system.heartbeat');
  });

  test('TypedDeliverables: users CANNOT emit/publish system.digest (not authorized)', () => {
    // @ts-expect-error — system.digest emittedBy='orders'|'inventory'
    void broker.emit('system.digest', { digestId: 'd1', events: 1 });
    // @ts-expect-error — system.digest publishedBy='orders'|'inventory'
    void broker.publish('system.digest', { digestId: 'd1', events: 1 });
  });

  test('createTypedBroker<S> returns a TypedBroker<S>', () => {
    const _b = createTypedBroker<'users'>(null as any);
    type B = typeof _b;
    const _check: B extends TypedBroker<'users'> ? true : false = true;
    void _check;
  });
});

describe('TypedBroker<"orders"> — scoped to orders service', () => {
  const broker = null as unknown as TypedBroker<'orders'>;

  test('emit: orders can emit its own events', () => {
    void broker.emit('orders.placed', { id: 'o1', userId: 'u1', total: 1 });
  });

  test('emit: orders can emit shared inventory.adjusted (multi-emitter)', () => {
    void broker.emit('inventory.adjusted', { sku: 'X', delta: -1 });
  });

  test('emit: orders CANNOT emit users.created', () => {
    // @ts-expect-error — emittedBy='users'
    void broker.emit('users.created', { id: 'u1', email: 'a@b.c', name: 'A' });
  });

  test('TypedDeliverables: orders can emit AND publish system.digest', () => {
    void broker.emit('system.digest', { digestId: 'd1', events: 5 });
    void broker.broadcast('system.digest', { digestId: 'd1', events: 5 });
    void broker.publish('system.digest', { digestId: 'd1', events: 5 });
  });
});

describe('TypedBroker<"inventory"> — scoped to inventory service', () => {
  const broker = null as unknown as TypedBroker<'inventory'>;

  test('emit: inventory can emit inventory.adjusted', () => {
    void broker.emit('inventory.adjusted', { sku: 'X', delta: 1 });
  });

  test('publish: inventory CANNOT publish to notifications.send', () => {
    // @ts-expect-error — notifications.send publishedBy excludes 'inventory'
    void broker.publish('notifications.send', { userId: 'u1', message: 'hi' });
  });

  test('publish: inventory can publish to audit.event', () => {
    void broker.publish('audit.event', {
      service: 'inventory',
      action: 'adjust',
      at: 0
    });
  });
});

describe('CallableBy enforcement', () => {
  test('non-authorized service CANNOT call restricted actions', () => {
    const broker = null as unknown as TypedBroker<'orders'>;
    // @ts-expect-error — users.adminTask callableBy='users'|'admin', excludes 'orders'
    void broker.call('users.adminTask', { taskId: 't1' });
  });

  test('admin (in callableBy) CAN call', async () => {
    const broker = null as unknown as TypedBroker<'admin'>;
    void (await broker.call('users.adminTask', { taskId: 't1' }));
  });
});
