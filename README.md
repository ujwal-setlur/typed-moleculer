# About

Consolidation of `moleculer-decorators-extra` and `typed-moleculer` packages.

`moleculer` is a peer dependency, so it will need to be installed separately.

Works with `Cron` mixin class taken form https://www.npmjs.com/package/moleculer-cron.

Example usage:

```TypeScript
import { Action, CronJob, Service } from 'typed-moleculer';
const Cron = require('moleculer-cron');

@Service({
  ...opts,
  mixins: [Cron]
})
export class MyService extends moleculer.Service {
  @CronJob({
    cronTime: '* * * * * *'
    // The same options as for `moleculer-cron`
  })
  async theJob() {
    console.dir('I am the job that runs every second');
  }
}
```

# ...

![Moleculer logo](https://raw.githubusercontent.com/ice-services/moleculer/HEAD/docs/assets/logo.png)

[![npm](https://img.shields.io/npm/v/moleculer-decorators.svg)](https://www.npmjs.com/package/moleculer-decorators)
[![npm](https://img.shields.io/npm/dm/moleculer-decorators.svg)](https://www.npmjs.com/package/moleculer-decorators)
[![GitHub issues](https://img.shields.io/github/issues/ColonelBundy/moleculer-decorators.svg)](https://github.com/ColonelBundy/moleculer-decorators/issues)
[![GitHub license](https://img.shields.io/github/license/ColonelBundy/moleculer-decorators.svg)](https://github.com/ColonelBundy/moleculer-decorators/blob/master/LICENSE)
[![Powered by moleculer](https://img.shields.io/badge/Powered%20by-Moleculer-green.svg?colorB=0e83cd)](http://moleculer.services/)

# Moleculer Decorators

> Decorators for moleculer, Tested & accurate as of 0.14

## Available options

```js
constructOverride: false; // True by default, This will override any properties defined in @Service if defined in the constructor as well.
skipHandler: true; // false by default, this will let a mixin override the handler in an action. (action options)
```

> These are defined in @Service

# Example usage

```js
const moleculer = require('moleculer');
const { Service, Action, Event, Method } = require('moleculer-decorators');
const web = require('moleculer-web');
const broker = new moleculer.ServiceBroker({
  logger: console,
  logLevel: "debug",
});

@Service({
  mixins: [web],
  settings: {
    port: 3000,
    routes: [
      ...
    ]
  }
})
class ServiceName extends moleculer.Service {

  // Optional constructor
  constructor() {
    this.settings = { // Overrides above by default, to prevent this, add "constructOverride: false" to @Service
      port: 3001
    }
  }

  // Without constructor (typescript)
  settings = {
    port: 3001
  }

  @Action()
  Login(ctx) {
    ...
  }

  @Action({
    skipHandler: true // Any options will be merged with the mixin's action.
  })
  Login3() { // this function will never be called since a mixin will override it, unless you specify skipHandler: false.

  }

  // With options
  // No need for "handler:{}" here
  @Action({
    cache: false,
    params: {
      a: "number",
      b: "number"
    }
  })
  Login2(ctx) {
    ...
  }

  @Event({
    group: 'group_name'
  })
  'event.name'(payload, sender, eventName) {
    ...
  }

  @Event()
  'event.name'(payload, sender, eventName) {
    ...
  }

  @Method
  authorize(ctx, route, req, res) {
    ...
  }

  started() { // Reserved for moleculer, fired when started
    ...
  }

  created() { // Reserved for moleculer, fired when created
    ...
  }

  stopped() { // Reserved for moleculer, fired when stopped
    ...
  }
}

broker.createService(ServiceName);
broker.start();
```

# Usage with moleculer-runner

> Simply export the service instead of starting a broker manually.  
> It must be a commonjs module.

```js
module.exports = ServiceName;
```

## Usage with custom ServiceFactory class

> Moleculer allows you to define your own ServiceFactory class, from which your services should inherit.
> All you have to do, is pass your custom ServiceFactory to broker options and also extend your services from this class

```js
const moleculer = require('moleculer');
const { Service, Action } = require('moleculer-decorators');

// create new service factory, inheriting from moleculer native Service
class CustomService extends moleculer.Service {
  constructor(broker, schema) {
    super(broker, schema);
  }

  foo() {
    return 'bar';
  }
}

// pass your custom service factory to broker options
const broker = new moleculer.ServiceBroker({
  ServiceFactory: CustomService
});

@Service()
class ServiceName extends CustomService {
  // extend your service from your custom service factory
  @Action()
  Bar(ctx) {
    return this.foo();
  }
}

broker.createService(CustomService);
broker.start();
```

## Typing servica actions and events

Define actions you handle and events you emit in your service in a `<service>.service.types.ts` file:

Example sample1.service.types.ts:

```ts
import {
  GenericActionWithParameters,
  GenericActionWithoutParameters,
  GenericEventWithoutPayload,
  GenericEventWithPayload
} from 'typed-moleculer';

export type ServiceName = 'sample1';

export type ServiceAction =
  | GenericActionWithoutParameters<'sample1.hello', string>
  | GenericActionWithParameters<
      'sample1.boo',
      { foo: string; bar?: string },
      string
    >
  | GenericActionWithParameters<'sample1.welcome', { name: string }, string>;

export type ServiceEvent =
  | GenericEventWithoutPayload<'sample1.event1'>
  | GenericEventWithPayload<'sample1.event2', { id: string }>;
```

Example sample2.service.types.ts:

```ts
import {
  GenericActionWithParameters,
  GenericActionWithoutParameters,
  GenericEventWithoutPayload,
  GenericEventWithPayload
} from 'typed-moleculer';

export type ServiceName = 'sample2';

export type ServiceAction =
  | GenericActionWithoutParameters<'sample2.hello', string>
  | GenericActionWithParameters<
      'sample2.boo',
      { foo: string; bar?: string },
      string
    >
  | GenericActionWithParameters<'sample2.welcome', { name: string }, string>;

export type ServiceEvent =
  | GenericEventWithoutPayload<'sample2.event1'>
  | GenericEventWithPayload<'sample2.event2', { id: string }>;
```

Then, when you want to call actions and emit events, you import the type definitions and feed them to a typed moleculer broker from this package:

main.ts:

```ts
import { TypedServiceBroker } from 'typed-moleculer';

// import the service types from sample1 service
import {
  ServiceAction as Sample1Action,
  ServiceEvent as Sample1Event,
  ServiceName as Sample1Name
} from './sample1.service.types'; // eslint-disable-line import/extensions

// import the actual service schema of the sample1 service
import sample1 from './sample1.service'; // eslint-disable-line import/extensions

// import the service types from sample2 service
import {
  ServiceAction as Sample2Action,
  ServiceEvent as Sample2Event,
  ServiceName as Sample2Name
} from './sample2.service.types'; // eslint-disable-line import/extensions

// import the actual service schema of the sample2 service
import sample2 from './sample2.service'; // eslint-disable-line import/extensions

// build union of types
type ServiceAction = Sample1Action | Sample2Action;
type ServiceEvent = Sample1Event | Sample2Event;
type ServiceName = Sample1Name | Sample2Name;

// create the typed broker
const broker: TypedServiceBroker<ServiceAction, ServiceEvent, ServiceName> =
  new TypedServiceBroker<ServiceAction, ServiceEvent, ServiceName>({
    logLevel: 'info'
  });

// create the services and start the broker
broker.createService(sample1);
broker.createService(sample2);
broker.start();

// now the broker call/emit methods are typescript aware to your specific services
broker.emit('sample1.event2', { id: '1234' }); // no typescript error

broker.emit('sample1.event2'); // typescript error since arguments are expected

broker.emit('sample1.event2', { id: 1234 }); // typescript error since arguments are of wrong type

broker.call('sample1.hello'); // no typescript error

broker.call('sample1.hello', {}); // typescript error since this action does not take an argument

broker.call('sample1.welcome', {
  name: 'John'
}); // no typescript error

broker.call('sample1.welcome'); // typescript error since arguments are expected

broker.call('sample1.welcome', {
  id: 1234
}); // typescript error since wrong type of arguments are supplied

const result: PromiseLike<number> = broker.call('sample1.welcome', {
  name: 'John'
}); // typescript error since return type is different
```

On VS Code and other typescript aware IDEs, code intellisense should work:

<p align="center">
<img src="image1.png" width="1000" height="200" />
</p>

<p align="center">
<img src="image2.png" width="1000" height="200" />
</p>

<p align="center">
<img src="image3.png" width="1000" height="200" />
</p>

# License

Moleculer Decorators is available under the [MIT license](https://tldrlegal.com/license/mit-license).
