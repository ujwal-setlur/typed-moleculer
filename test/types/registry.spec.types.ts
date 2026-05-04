/**
 * Type-level tests for registry helper types. Run via vitest's typecheck
 * mode (see vitest.config.ts) — `expectTypeOf` failures show up as
 * compile errors when running `npm test`.
 */

import type {
  ActionParams,
  ActionReturns,
  CallableBy,
  ChannelPayload,
  EmittableBy,
  EventPayload,
  PublishableBy
} from 'typed-moleculer';

import { expectTypeOf } from 'vitest';

import type {
  AuditEventPayload,
  GetUserParams,
  InventoryAdjustedPayload,
  NotificationPayload,
  Order,
  User
} from './registry.fixtures';

// Side-effect — pull registry contributions into scope.
import './registry.fixtures';

describe('registry helper types', () => {
  describe('ActionParams / ActionReturns', () => {
    test('extracts params and returns for a registered action', () => {
      expectTypeOf<
        ActionParams<'users.getUser'>
      >().toEqualTypeOf<GetUserParams>();
      expectTypeOf<ActionReturns<'users.getUser'>>().toEqualTypeOf<User>();
    });

    test('void-params action', () => {
      expectTypeOf<ActionParams<'users.ping'>>().toEqualTypeOf<void>();
      expectTypeOf<ActionReturns<'users.ping'>>().toEqualTypeOf<string>();
    });
  });

  describe('EventPayload', () => {
    test('extracts the payload type', () => {
      expectTypeOf<EventPayload<'users.created'>>().toEqualTypeOf<User>();
      expectTypeOf<
        EventPayload<'inventory.adjusted'>
      >().toEqualTypeOf<InventoryAdjustedPayload>();
      expectTypeOf<EventPayload<'orders.placed'>>().toEqualTypeOf<Order>();
    });
  });

  describe('ChannelPayload', () => {
    test('extracts the payload type', () => {
      expectTypeOf<
        ChannelPayload<'audit.event'>
      >().toEqualTypeOf<AuditEventPayload>();
      expectTypeOf<
        ChannelPayload<'notifications.send'>
      >().toEqualTypeOf<NotificationPayload>();
    });
  });

  describe('CallableBy<S> — call authorization (callableBy optional)', () => {
    test('users (in callableBy) can call restricted action', () => {
      type UsersCalls = CallableBy<'users'>;
      // unrestricted (users.getUser, users.ping) + users-allowed (users.adminTask)
      expectTypeOf<UsersCalls>().toEqualTypeOf<
        'users.getUser' | 'users.ping' | 'users.adminTask'
      >();
    });

    test('admin (in callableBy) can call restricted action', () => {
      type AdminCalls = CallableBy<'admin'>;
      expectTypeOf<AdminCalls>().toEqualTypeOf<
        'users.getUser' | 'users.ping' | 'users.adminTask'
      >();
    });

    test('orders (NOT in callableBy) cannot call restricted action; can call unrestricted', () => {
      type OrdersCalls = CallableBy<'orders'>;
      // restricted action excluded; unrestricted ones still callable
      expectTypeOf<OrdersCalls>().toEqualTypeOf<
        'users.getUser' | 'users.ping'
      >();
    });
  });

  describe('EmittableBy<S> — emit authorization (emittedBy optional)', () => {
    test('users can emit own events + cache.invalidate + unrestricted metrics.tick', () => {
      type UsersEmits = EmittableBy<'users'>;
      expectTypeOf<UsersEmits>().toEqualTypeOf<
        'users.created' | 'users.deleted' | 'cache.invalidate' | 'metrics.tick'
      >();
    });

    test('orders can emit own events + shared inventory.adjusted + system.digest + unrestricted metrics.tick', () => {
      type OrdersEmits = EmittableBy<'orders'>;
      expectTypeOf<OrdersEmits>().toEqualTypeOf<
        | 'orders.placed'
        | 'inventory.adjusted'
        | 'cache.invalidate'
        | 'system.digest'
        | 'metrics.tick'
      >();
    });

    test('inventory can emit inventory.adjusted, cache.invalidate, system.digest, metrics.tick', () => {
      type InventoryEmits = EmittableBy<'inventory'>;
      expectTypeOf<InventoryEmits>().toEqualTypeOf<
        | 'inventory.adjusted'
        | 'cache.invalidate'
        | 'system.digest'
        | 'metrics.tick'
      >();
    });

    test('returns (only listed on inventory.adjusted) emits inventory.adjusted + unrestricted metrics.tick', () => {
      type ReturnsEmits = EmittableBy<'returns'>;
      expectTypeOf<ReturnsEmits>().toEqualTypeOf<
        'inventory.adjusted' | 'metrics.tick'
      >();
    });

    test('unknown service still gets unrestricted events (metrics.tick)', () => {
      type UnknownEmits = EmittableBy<'unknown-service'>;
      expectTypeOf<UnknownEmits>().toEqualTypeOf<'metrics.tick'>();
    });
  });

  describe('PublishableBy<S> — publish authorization (publishedBy optional)', () => {
    test('users can publish to authorized channels + unrestricted metrics.report', () => {
      type UsersPubs = PublishableBy<'users'>;
      expectTypeOf<UsersPubs>().toEqualTypeOf<
        | 'audit.event'
        | 'notifications.send'
        | 'system.heartbeat'
        | 'metrics.report'
      >();
    });

    test('orders can publish to all channels + system.digest deliverable + metrics.report', () => {
      type OrdersPubs = PublishableBy<'orders'>;
      expectTypeOf<OrdersPubs>().toEqualTypeOf<
        | 'audit.event'
        | 'notifications.send'
        | 'system.heartbeat'
        | 'system.digest'
        | 'metrics.report'
      >();
    });

    test('inventory can publish to audit.event + system.digest + metrics.report', () => {
      type InventoryPubs = PublishableBy<'inventory'>;
      expectTypeOf<InventoryPubs>().toEqualTypeOf<
        'audit.event' | 'system.digest' | 'metrics.report'
      >();
    });

    test('unknown service still gets unrestricted channels (metrics.report)', () => {
      type UnknownPubs = PublishableBy<'unknown'>;
      expectTypeOf<UnknownPubs>().toEqualTypeOf<'metrics.report'>();
    });
  });
});
