import type { CronJobOptions } from './types';

/**
 * `@CronJob` — registers the decorated method as a scheduled task.
 * Consumed by a moleculer cron mixin that reads the `crons` field on
 * the service schema (e.g. `@stretchshop/moleculer-cron` or compatible
 * forks). The method body runs at each tick.
 *
 *     @CronJob({ cronTime: '0 * * * *', timeZone: 'UTC' })
 *     async hourlySweep() {...}
 */
export function CronJob(opts: CronJobOptions) {
  return function CronJobDecorator(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): void {
    const crons = (target.crons ??= []);
    crons.push({
      name: propertyKey,
      onTick: descriptor.value,
      manualStart: false,
      ...opts
    });
  };
}
