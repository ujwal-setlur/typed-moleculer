import { Context } from 'moleculer';
import { TypedServiceBroker } from '../index';
import {
  ServiceAction,
  ServiceEvent,
  ServiceName
} from './services/typed.service.types';
import typedService from './services/typed.service';

const ChannelMiddleware = require('@moleculer/channels').Middleware;

const mw = ChannelMiddleware({
  adapter: {
    type: 'Fake'
  },
  sendMethodName: 'sendChannelEvent' // override the sendMethodName so that we can type sendToChannel()
});

describe('typed service', () => {
  const broker: TypedServiceBroker<
    ServiceAction,
    ServiceEvent,
    ServiceName,
    {
      auth: {
        userId: string;
        clientId: string;
        roles: string[];
      };
    }
  > = new TypedServiceBroker({
    logLevel: 'fatal',
    middlewares: [mw]
  });

  const sampleService = broker.createService(typedService);

  beforeAll(async () => {
    await broker.start();
    await broker.waitForServices('typedService');
  });

  afterAll(async () => {
    broker.destroyService(sampleService);
    await broker.stop();
  });

  // test actions
  describe('Testing actions', () => {
    it('Action without parameter', async () => {
      const response: string = await broker.call('typedService.hello');
      expect(response).toBe('Hello World null!');
    });

    it('Action without parameter, but with calling options', async () => {
      const response: string = await broker.call(
        'typedService.hello',
        undefined,
        {
          caller: 'test'
        }
      );
      expect(response).toBe('Hello World test!');
    });

    it('Action with required parameter', async () => {
      const response: string = await broker.call(
        'typedService.welcome',
        {
          name: 'John Doe'
        },
        {
          meta: {
            auth: {
              userId: 'abcd',
              clientId: 'efgh',
              roles: ['admin']
            }
          }
        }
      );
      expect(response).toBe('Welcome John Doe!');
    });

    it('Action with optional parameter missing', async () => {
      const response: string = await broker.call('typedService.boo', {
        foo: 'Foo'
      });
      expect(response).toBe('Welcome Foo!');
    });

    it('Action with optional parameter included', async () => {
      const response: string = await broker.call('typedService.boo', {
        foo: 'Foo',
        bar: 'Bar'
      });
      expect(response).toBe('Welcome Foo Bar!');
    });
  });

  // test events
  describe('Testing events', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('Event1 without payload', () => {
      const event1Spy = jest.spyOn(sampleService, 'event1TestReturn');
      broker.emit('typedService.event1', undefined, 'typedService');
      expect(event1Spy).toBeCalledTimes(1);
    });

    it('Event1 with payload', () => {
      const event1Spy = jest.spyOn(sampleService, 'event1TestReturn');
      // We use emitlocalEventHandler because our typed broker won't allow us to send bad payloads :-)
      sampleService.emitLocalEventHandler(
        'typedService.event1',
        { foo: 'bar' },
        'typedService'
      );
      expect(event1Spy).toBeCalledTimes(0);
    });

    it('Event2 with good payload', () => {
      const event2Spy = jest.spyOn(sampleService, 'event2TestReturn');
      broker.emit('typedService.event2', { id: '1234' }, 'typedService');
      expect(event2Spy).toBeCalledTimes(1);
    });

    it('Event2 with bad payload', () => {
      const event2Spy = jest.spyOn(sampleService, 'event2TestReturn');
      // We use emitlocalEventHandler because our typed broker won't allow us to send bad payloads :-)
      sampleService.emitLocalEventHandler(
        'typedService.event2',
        { id: 1234 },
        'typedService'
      );
      expect(event2Spy).toBeCalledTimes(0);
    });
  });

  // test channel messages
  describe('Testing channel messages', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('Channel event without payload', async () => {
      const returnSpy = jest.spyOn(sampleService, 'channelTestReturn');
      await broker.sendToChannel('typedService.channel-event-1');
      expect(returnSpy).toBeCalledTimes(1);
      expect(returnSpy).toHaveBeenCalledWith('Hello World');
    });

    it('Channel event with payload', async () => {
      const returnSpy = jest.spyOn(sampleService, 'channelTestReturn');
      await broker.sendToChannel('typedService.channel-event-2', 'Hello World');
      expect(returnSpy).toBeCalledTimes(1);
      expect(returnSpy).toHaveBeenCalledWith('Hello World');
    });

    it('Channel event without payload, but with options', async () => {
      const returnSpy = jest.spyOn(sampleService, 'channelTestReturn');
      await broker.sendToChannel('typedService.channel-event-1', undefined, {
        ttl: 10000
      });
      expect(returnSpy).toBeCalledTimes(1);
      expect(returnSpy).toHaveBeenCalledWith('Hello World');
    });

    it('Channel event with payload, but with headers', async () => {
      const resturnSpy = jest.spyOn(sampleService, 'channelTestReturn');
      const headersSpy = jest.spyOn(sampleService, 'channelHeaders');
      await broker.sendToChannel(
        'typedService.channel-event-2',
        'Hello World',
        {
          headers: {
            foo: 'bar'
          }
        }
      );
      expect(resturnSpy).toBeCalledTimes(1);
      expect(headersSpy).toBeCalledTimes(1);
      expect(resturnSpy).toHaveBeenCalledWith('Hello World');
      expect(headersSpy).toHaveBeenCalledWith({
        foo: 'bar'
      });
    });

    it('Channel event with context', async () => {
      const contextSpy = jest.spyOn(sampleService, 'channelContextMeta');

      const ctx = Context.create(
        broker,
        null as any,
        { payload: 'Hello World' },
        {
          meta: {
            auth: {
              userId: '123'
            }
          }
        }
      );
      await broker.sendToChannel(
        'typedService.channel-with-context',
        (ctx.params as any).payload,
        {
          ctx,
          headers: {
            foo: 'bar'
          }
        }
      );
      expect(contextSpy).toBeCalledTimes(1);
      expect(contextSpy).toHaveBeenCalledWith({
        auth: {
          userId: '123'
        }
      });
    });
  });
});
