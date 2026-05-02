/**
 * Runtime smoke tests for the broker factories. These are pure type-
 * casting helpers — calling them with a real ServiceBroker should return
 * the same instance with no behavior change.
 */

import { ServiceBroker } from 'moleculer';

import { createScopedBroker } from '../../src/broker';
import { createTypedBroker } from '../../src/typed.broker';

describe('broker factories', () => {
  test('createTypedBroker returns the same broker instance', () => {
    const real = new ServiceBroker({ logLevel: 'fatal' });
    const typed = createTypedBroker(real);
    expect(typed).toBe(real);
  });

  test('createScopedBroker returns the same broker instance', () => {
    const real = new ServiceBroker({ logLevel: 'fatal' });
    const scoped = createScopedBroker<'users'>(real);
    expect(scoped).toBe(real);
  });
});
