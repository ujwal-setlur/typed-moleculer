/**
 * Runtime tests for the decorators. Verifies that each decorator
 * produces the correct shape on the moleculer ServiceSchema, and that
 * a decorated class instantiates correctly via `broker.createService`.
 */

import moleculer, { ServiceBroker } from 'moleculer';

// Runtime tests: import via relative path so v8 coverage tracks the
// source files. Type-level tests use the 'typed-moleculer' package
// alias to exercise module-aug-style semantics.
import {
  Action,
  Channel,
  CronJob,
  Event,
  Method,
  Service
} from '../../src/decorators';

const QUIET_BROKER_OPTS = {
  logLevel: 'fatal' as const,
  metrics: false,
  tracking: { enabled: false }
};

describe('decorator runtime behavior', () => {
  describe('@Service + @Action', () => {
    @Service({ name: 'svc-a' })
    class SvcA extends moleculer.Service {
      @Action({ params: { id: 'string' } })
      async getThing(ctx: moleculer.Context<{ id: string }>) {
        return `got: ${ctx.params.id}`;
      }
    }

    test('action handler is invocable via broker.call', async () => {
      const broker = new ServiceBroker(QUIET_BROKER_OPTS);
      broker.createService(SvcA);
      await broker.start();
      try {
        const r: string = await (broker as any).call('svc-a.getThing', {
          id: '42'
        });
        expect(r).toBe('got: 42');
      } finally {
        await broker.stop();
      }
    });

    test('@Service options propagate to schema (mixins, settings)', async () => {
      @Service({
        name: 'svc-with-settings',
        settings: { customSetting: 'hello' }
      })
      class SvcWithSettings extends moleculer.Service {
        @Action()
        readSetting() {
          // moleculer's `this.settings` is strictly typed to
          // `ServiceSettingSchema`; user-defined keys need a cast.
          return (this.settings as any).customSetting;
        }
      }

      const broker = new ServiceBroker(QUIET_BROKER_OPTS);
      broker.createService(SvcWithSettings);
      await broker.start();
      try {
        const r = await (broker as any).call('svc-with-settings.readSetting');
        expect(r).toBe('hello');
      } finally {
        await broker.stop();
      }
    });

    test('default name comes from the class name when not provided', async () => {
      @Service()
      class DefaultNameService extends moleculer.Service {
        @Action()
        ping() {
          return 'pong';
        }
      }

      const broker = new ServiceBroker(QUIET_BROKER_OPTS);
      broker.createService(DefaultNameService);
      await broker.start();
      try {
        const r = await (broker as any).call('DefaultNameService.ping');
        expect(r).toBe('pong');
      } finally {
        await broker.stop();
      }
    });

    test('user-supplied custom action options pass through (e.g., restricted)', async () => {
      @Service({ name: 'svc-restricted' })
      class SvcRestricted extends moleculer.Service {
        @Action({ restricted: true, stateChange: true } as any)
        doThing() {
          return 'ok';
        }
      }

      const broker = new ServiceBroker(QUIET_BROKER_OPTS);
      const svc = broker.createService(SvcRestricted);
      const action = (svc.schema as any).actions.doThing;
      expect(action.restricted).toBe(true);
      expect(action.stateChange).toBe(true);
    });
  });

  describe('@Method', () => {
    test('method is bound to service and callable from action', async () => {
      @Service({ name: 'svc-with-method' })
      class SvcWithMethod extends moleculer.Service {
        @Action()
        useHelper() {
          return (this as any).helper(2);
        }

        @Method
        helper(x: number) {
          return x + 40;
        }
      }

      const broker = new ServiceBroker(QUIET_BROKER_OPTS);
      broker.createService(SvcWithMethod);
      await broker.start();
      try {
        const r = await (broker as any).call('svc-with-method.useHelper');
        expect(r).toBe(42);
      } finally {
        await broker.stop();
      }
    });
  });

  describe('@Event', () => {
    test('event handler receives ctx with params/eventName/nodeID', async () => {
      const received: unknown[] = [];

      @Service({ name: 'svc-event' })
      class SvcEvent extends moleculer.Service {
        @Event()
        'svc-event.heard'(ctx: moleculer.Context) {
          received.push({
            params: ctx.params,
            eventName: ctx.eventName,
            nodeID: ctx.nodeID
          });
        }
      }

      const broker = new ServiceBroker(QUIET_BROKER_OPTS);
      broker.createService(SvcEvent);
      await broker.start();
      try {
        await broker.emit('svc-event.heard', { ping: true });
        // moleculer dispatches local emits synchronously enough; allow a microtask
        await new Promise(r => setTimeout(r, 10));
        expect(received).toHaveLength(1);
        expect((received[0] as any).params).toEqual({ ping: true });
        expect((received[0] as any).eventName).toBe('svc-event.heard');
      } finally {
        await broker.stop();
      }
    });
  });

  describe('@Channel', () => {
    test('channel options + handler land on schema.channels', () => {
      @Service({ name: 'svc-chan' })
      class SvcChan extends moleculer.Service {
        @Channel({ group: 'g1', maxRetries: 5 })
        'svc-chan.message'() {
          return 'handled';
        }
      }

      const broker = new ServiceBroker(QUIET_BROKER_OPTS);
      const svc = broker.createService(SvcChan);
      const channels = (svc.schema as any).channels;
      expect(channels).toBeDefined();
      const entry = channels['svc-chan.message'];
      expect(entry.group).toBe('g1');
      expect(entry.maxRetries).toBe(5);
      expect(typeof entry.handler).toBe('function');
    });
  });

  describe('@CronJob', () => {
    test('cron entries are pushed onto schema.crons', () => {
      @Service({ name: 'svc-cron' })
      class SvcCron extends moleculer.Service {
        @CronJob({ cronTime: '0 * * * *', timeZone: 'UTC' })
        async hourly() {
          // intentionally empty
        }

        @CronJob({ cronTime: '*/5 * * * *' })
        async fiveMinutely() {
          // intentionally empty
        }
      }

      const broker = new ServiceBroker(QUIET_BROKER_OPTS);
      const svc = broker.createService(SvcCron);
      const crons = (svc.schema as any).crons;
      expect(Array.isArray(crons)).toBe(true);
      expect(crons).toHaveLength(2);
      const hourly = crons.find((c: any) => c.name === 'hourly');
      expect(hourly.cronTime).toBe('0 * * * *');
      expect(hourly.timeZone).toBe('UTC');
      expect(hourly.manualStart).toBe(false);
      expect(typeof hourly.onTick).toBe('function');
    });
  });

  describe('lifecycle hooks', () => {
    test('created/started/stopped class methods are wired into schema', async () => {
      const calls: string[] = [];

      @Service({ name: 'svc-lifecycle' })
      class SvcLifecycle extends moleculer.Service {
        // Note: moleculer.Service already declares these signatures —
        // overriding them here just stashes them on the prototype
        // for our @Service decorator to hoist into the schema.
        created() {
          calls.push('created');
        }
        async started() {
          calls.push('started');
        }
        async stopped() {
          calls.push('stopped');
        }
      }

      const broker = new ServiceBroker(QUIET_BROKER_OPTS);
      broker.createService(SvcLifecycle);
      await broker.start();
      await broker.stop();

      expect(calls).toEqual(['created', 'started', 'stopped']);
    });
  });
});
