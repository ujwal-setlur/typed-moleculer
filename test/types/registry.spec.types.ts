/**
 * Type-level tests for registry helper types. Run via vitest's typecheck
 * mode (see vitest.config.ts) — `expectTypeOf` failures show up as
 * compile errors when running `npm test`.
 */

import type {
  ActionParams,
  ActionReturns,
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

    test('action with no params has params: undefined', () => {
      expectTypeOf<ActionParams<'users.ping'>>().toEqualTypeOf<undefined>();
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

  describe('EmittableBy<S> — emit-ownership narrowing', () => {
    test('users can emit its own events (not inventory.adjusted)', () => {
      type UsersEmits = EmittableBy<'users'>;
      expectTypeOf<UsersEmits>().toEqualTypeOf<
        'users.created' | 'users.deleted'
      >();
    });

    test('orders can emit its own events plus shared inventory.adjusted', () => {
      type OrdersEmits = EmittableBy<'orders'>;
      expectTypeOf<OrdersEmits>().toEqualTypeOf<
        'orders.placed' | 'inventory.adjusted'
      >();
    });

    test('inventory can emit only inventory.adjusted', () => {
      type InventoryEmits = EmittableBy<'inventory'>;
      expectTypeOf<InventoryEmits>().toEqualTypeOf<'inventory.adjusted'>();
    });

    test('returns (only listed on inventory.adjusted) emits only that', () => {
      type ReturnsEmits = EmittableBy<'returns'>;
      expectTypeOf<ReturnsEmits>().toEqualTypeOf<'inventory.adjusted'>();
    });

    test('a service not in any emittedBy union has no emittable events', () => {
      type UnknownEmits = EmittableBy<'unknown-service'>;
      expectTypeOf<UnknownEmits>().toBeNever();
    });
  });

  describe('PublishableBy<S> — publish-ownership narrowing', () => {
    test('users can publish to audit.event and notifications.send', () => {
      type UsersPubs = PublishableBy<'users'>;
      expectTypeOf<UsersPubs>().toEqualTypeOf<
        'audit.event' | 'notifications.send'
      >();
    });

    test('orders can publish to both as well', () => {
      type OrdersPubs = PublishableBy<'orders'>;
      expectTypeOf<OrdersPubs>().toEqualTypeOf<
        'audit.event' | 'notifications.send'
      >();
    });

    test('inventory can publish only audit.event', () => {
      type InventoryPubs = PublishableBy<'inventory'>;
      expectTypeOf<InventoryPubs>().toEqualTypeOf<'audit.event'>();
    });

    test('a service not in any publishedBy has no publishable channels', () => {
      type UnknownPubs = PublishableBy<'unknown'>;
      expectTypeOf<UnknownPubs>().toBeNever();
    });
  });
});
