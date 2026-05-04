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

export interface SystemDigestPayload {
  digestId: string;
  events: number;
}

export interface AdminTaskParams {
  taskId: string;
}

declare module 'typed-moleculer' {
  // Actions — visibility scoped by import graph; callableBy optional.
  interface TypedActions {
    // Unrestricted: no callableBy → any service in scope may call.
    'users.getUser': { params: GetUserParams; returns: User };
    'users.ping': { params: void; returns: string };
    // Restricted via callableBy.
    'users.adminTask': {
      params: AdminTaskParams;
      returns: void;
      callableBy: 'users' | 'admin';
    };
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
    // Void-payload event: parity with moleculer 0.14's `broadcast(name)`
    // ergonomic. `cache.invalidate` is a typical protocol-style event:
    // notifies listeners that something changed; carries no data.
    'cache.invalidate': {
      payload: void;
      emittedBy: 'users' | 'orders' | 'inventory';
    };
    // Unrestricted event: no emittedBy → any service in scope may emit.
    'metrics.tick': {
      payload: void;
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
    // Void-payload channel: signal-only message (e.g. heartbeat).
    'system.heartbeat': {
      payload: void;
      publishedBy: 'users' | 'orders';
    };
    // Unrestricted channel: no publishedBy → any service in scope may publish.
    'metrics.report': {
      payload: { metric: string; value: number };
    };
  }

  // Deliverables — entries delivered as BOTH event and channel
  // (durability-fallback pattern: try publish, catch and emit). Single
  // declaration contributes to TypedEvents and TypedChannels at the
  // type level.
  interface TypedDeliverables {
    'system.digest': {
      payload: SystemDigestPayload;
      emittedBy: 'orders' | 'inventory';
      publishedBy: 'orders' | 'inventory';
    };
  }
}
