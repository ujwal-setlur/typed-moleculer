/**
 * Sample registry contributions used by the type-level tests. Mirrors
 * the pattern code consuming typed-moleculer would follow: a small file
 * with `declare module 'typed-moleculer'` blocks contributing its slice
 * of actions / events / channels.
 *
 * Generic e-commerce-style domain: users / orders / inventory /
 * notifications / audit. No tie to any specific project.
 */

import 'typed-moleculer';

// --- mock domain types ---

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface GetUserParams {
  id: string;
}

export interface Order {
  id: string;
  userId: string;
  total: number;
}

export interface InventoryAdjustedPayload {
  sku: string;
  delta: number;
}

export interface AuditEventPayload {
  service: string;
  action: string;
  at: number;
}

export interface NotificationPayload {
  userId: string;
  message: string;
}

declare module 'typed-moleculer' {
  // Actions — globally callable; visibility scoped by import graph.
  interface TypedActions {
    'users.getUser': { params: GetUserParams; returns: User };
    'users.ping': { params: undefined; returns: string };
  }

  // Events — emit-ownership via emittedBy.
  interface TypedEvents {
    'users.created': {
      payload: User;
      emittedBy: 'users';
    };
    'users.deleted': {
      payload: { id: string };
      emittedBy: 'users';
    };
    'inventory.adjusted': {
      payload: InventoryAdjustedPayload;
      // Multi-emitter: orders adjusts on placement, returns adjusts on
      // refund, inventory itself adjusts on direct admin actions.
      emittedBy: 'orders' | 'returns' | 'inventory';
    };
    'orders.placed': {
      payload: Order;
      emittedBy: 'orders';
    };
  }

  // Channels — publish-ownership via publishedBy.
  interface TypedChannels {
    'audit.event': {
      payload: AuditEventPayload;
      // Most services log audit events.
      publishedBy: 'users' | 'orders' | 'inventory';
    };
    'notifications.send': {
      payload: NotificationPayload;
      publishedBy: 'orders' | 'users';
    };
  }
}
