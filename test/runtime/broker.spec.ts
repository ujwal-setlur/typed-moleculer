/**
 * Runtime smoke test for the broker factory. Pure type-casting helper —
 * calling it with a real ServiceBroker should return the same instance
 * with no behavior change.
 */

import { ServiceBroker } from 'moleculer';

import { createTypedBroker } from '../../src/typed.broker';

describe('broker factory', () => {
  test('createTypedBroker returns the same broker instance (scoped)', () => {
    const real = new ServiceBroker({ logLevel: 'fatal' });
    const typed = createTypedBroker<'users'>(real);
    expect(typed).toBe(real);
  });

  test('createTypedBroker returns the same broker instance (unscoped via <any>)', () => {
    const real = new ServiceBroker({ logLevel: 'fatal' });
    // `any` is the explicit "no scoping" opt-out.
    const typed = createTypedBroker<any>(real);
    expect(typed).toBe(real);
  });
});
