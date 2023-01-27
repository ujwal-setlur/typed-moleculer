import util from 'util';
import moleculer, { Errors } from 'moleculer';
import { Action, Channel, Event, Method, Service } from '../../index';

import { serviceName } from './typed.service.types';
import { runInThisContext } from 'vm';

const eventSchema = { id: 'string' };

// Define our service
@Service({
  // Our service name
  name: serviceName
})
class typedService extends moleculer.Service {
  // Our actions
  @Action()
  hello(ctx: moleculer.Context) {
    this.logger.info(
      `hello got called from ${ctx.nodeID}; caller: ${ctx.caller}`
    );
    return `Hello World ${ctx.caller}!`;
  }

  @Action({
    cache: false,
    params: {
      name: 'string'
    }
  })
  welcome(ctx: moleculer.Context<{ name: string }>) {
    this.logger.info(`welcome got called from ${ctx.nodeID}`);
    return `Welcome ${ctx.params.name}!`;
  }

  @Action({
    cache: false,
    params: {
      foo: 'string',
      bar: {
        type: 'string',
        optional: true
      }
    }
  })
  boo(ctx: moleculer.Context<{ foo: string; bar?: string }>) {
    this.logger.info(`boo got called from ${ctx.nodeID}`);
    if (ctx.params.bar) return `Welcome ${ctx.params.foo} ${ctx.params.bar}!`;
    return `Welcome ${ctx.params.foo}!`;
  }

  /* istanbul ignore next */
  @Method
  event1TestReturn() {} // eslint-disable-line class-methods-use-this

  @Event() 'typedService.event1'(
    payload: never,
    sender: string,
    eventName: string
  ) {
    if (payload) {
      this.logger.error(
        `Validation check failed! event ${eventName} does not take any payload!`
      );
      throw new Errors.ValidationError(
        'Event parameter check failed',
        'ERR_VALIDATION',
        payload
      );
    }

    this.logger.info(`Got event ${eventName} from sender ${sender}`);
    this.event1TestReturn();
  }

  /* istanbul ignore next */
  @Method
  event2TestReturn() {} // eslint-disable-line class-methods-use-this

  @Event({
    params: {
      id: 'string'
    }
  })
  'typedService.event2'(
    payload: typeof eventSchema,
    sender: string,
    eventName: string
  ) {
    this.logger.info(
      `Got event ${eventName} from sender ${sender}; id: ${payload.id}`
    );
    this.event2TestReturn();
  }

  @Channel({ group: 'my-group' })
  'typedService.channel-event-1'() {
    this.channelTestReturn('Hello World');
  }

  @Channel({ group: 'my-group' })
  'typedService.channel-event-2'(payload: string, raw: any): string {
    this.channelTestReturn(payload);
    this.channelHeaders(raw.headers);
    return 'Hello';
  }

  @Method
  channelTestReturn(message: string) {
    // eslint-disable-line class-methods-use-this
    this.logger.info(`Got channel message ${message}`);
  }

  @Method
  channelHeaders(headers: any) {
    this.logger.info(`Got headers: ${util.inspect(headers)}`);
  }
}

export default typedService;
